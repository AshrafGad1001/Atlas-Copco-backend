
const { z } = require("zod");
const Visit = require("../models/Visit");
const Company = require("../models/Company");
const asyncHandler = require("../utils/asyncHandler");

const EDIT_WINDOW_HOURS = 24;

exports.visitSchema = z.object({
  company: z.string().min(1, "\u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0637\u0644\u0648\u0628\u0629").optional(),
  visitDate: z.string().optional(),
  type: z.string().optional(),
  notes: z.string().optional(),
  nextStep: z.string().optional(),
  status: z.enum(["planned", "completed", "cancelled"]).optional(),
  attendees: z.array(z.object({
    name: z.string().min(2, "\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628").max(100),
    jobTitle: z.string().max(100).optional().or(z.literal("")),
    phone: z.string().regex(/^[0-9+]{8,15}$/, "\u0631\u0642\u0645 \u0635\u062d\u064a\u062d").optional().or(z.literal(""))
  })).max(10, "\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 10").optional()
});

function formatChange(fromVal, toVal) {
  let f = fromVal == null ? "" : String(fromVal);
  let t = toVal == null ? "" : String(toVal);
  if (f.length > 300) f = f.substring(0, 300);
  if (t.length > 300) t = t.substring(0, 300);
  return { from: f, to: t };
}

exports.createVisit = asyncHandler(async (req, res) => {
  if (req.user.role === "engineer") {
    req.body.engineer = req.user._id;
  }
  
  if (!req.body.company) return res.status(400).json({ success: false, message: "\u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" });
  
  const company = await Company.findById(req.body.company);
  if (!company || company.isDeleted) return res.status(404).json({ success: false, message: "\u0634\u0631\u0643\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629" });
  
  if (req.user.role === "engineer" && company.region.toString() !== req.user.region.toString()) {
    return res.status(403).json({ success: false, message: "\u0644\u064a\u0633 \u0644\u062f\u064a\u0643 \u0635\u0644\u0627\u062d\u064a\u0629" });
  }

  if (req.body.visitDate) {
    const vd = new Date(req.body.visitDate);
    const maxDate = new Date(Date.now() + 5 * 60000);
    if (vd > maxDate) {
      return res.status(400).json({ success: false, message: "\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u0633\u062c\u064a\u0644 \u0632\u064a\u0627\u0631\u0629 \u0641\u064a \u0627\u0644\u0645\u0633\u062a\u0642\u0628\u0644" });
    }
  }

  const visit = await Visit.create(req.body);
  res.status(201).json({ success: true, data: visit });
});

exports.getVisits = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };
  if (req.user.role === "engineer") filter.engineer = req.user._id;
  
  if (req.query.company) filter.company = req.query.company;
  if (req.query.from || req.query.to) {
    filter.visitDate = {};
    if (req.query.from) filter.visitDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.visitDate.$lte = new Date(req.query.to);
  }
  if (req.query.type) filter.type = req.query.type;

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const visits = await Visit.find(filter)
    .populate("company", "nameAr nameEn region")
    .populate("engineer", "fullName")
    .sort("-visitDate")
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
    
  const mapped = visits.map(v => {
    const hours = (Date.now() - new Date(v.createdAt).getTime()) / 3600000;
    v.canEdit = req.user.role === "admin" || hours <= EDIT_WINDOW_HOURS;
    v.canDelete = req.user.role === "admin" || hours <= EDIT_WINDOW_HOURS;
    if (req.user.role === "engineer") delete v.editHistory;
    return v;
  });

  res.status(200).json({ success: true, data: mapped });
});

exports.getAdminVisits = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };
  if (req.query.company) filter.company = req.query.company;
  if (req.query.engineer) filter.engineer = req.query.engineer;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.from || req.query.to) {
    filter.visitDate = {};
    if (req.query.from) filter.visitDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.visitDate.$lte = new Date(req.query.to);
  }

  let companyFilter = {};
  if (req.query.region) {
    const comps = await Company.find({ region: req.query.region }).select("_id").lean();
    companyFilter = { $in: comps.map(c => c._id) };
    if (filter.company) {
      filter.company = companyFilter.$in.some(id => id.toString() === filter.company) ? filter.company : null;
    } else {
      filter.company = companyFilter;
    }
  }

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const total = await Visit.countDocuments(filter);
  const visits = await Visit.find(filter)
    .populate("company", "nameAr nameEn region")
    .populate("engineer", "fullName")
    .sort("-visitDate")
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const mapped = visits.map(v => {
    v.canEdit = true;
    v.canDelete = true;
    return v;
  });

  res.status(200).json({ success: true, data: mapped, pagination: { total, page, pages: Math.ceil(total / limit) } });
});

exports.getVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findOne({ _id: req.params.id, isDeleted: false })
    .populate("company", "nameAr nameEn region")
    .populate("engineer", "fullName region");

  if (!visit) return res.status(404).json({ success: false, message: "\u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629" });

  if (req.user.role === "engineer" && visit.engineer._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "\u0635\u0644\u0627\u062d\u064a\u0629 \u0645\u0631\u0641\u0648\u0636\u0629" });
  }

  const hours = (Date.now() - visit.createdAt.getTime()) / 3600000;
  const v = visit.toObject();
  v.canEdit = req.user.role === "admin" || hours <= EDIT_WINDOW_HOURS;
  v.canDelete = req.user.role === "admin" || hours <= EDIT_WINDOW_HOURS;
  if (req.user.role === "engineer") delete v.editHistory;

  res.status(200).json({ success: true, data: v });
});

exports.updateVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit || visit.isDeleted) return res.status(404).json({ success: false, message: "\u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629" });

  if (req.user.role === "engineer" && visit.engineer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "\u0635\u0644\u0627\u062d\u064a\u0629 \u0645\u0631\u0641\u0648\u0636\u0629" });
  }

  if (req.user.role === "engineer") {
    const hours = (Date.now() - visit.createdAt.getTime()) / 3600000;
    if (hours > EDIT_WINDOW_HOURS) {
      return res.status(403).json({ success: false, message: "\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0627\u0644\u062a\u0639\u062f\u064a\u0644 (24 \u0633\u0627\u0639\u0629)" });
    }
  }

  if (req.body.visitDate) {
    const vd = new Date(req.body.visitDate);
    const maxDate = new Date(Date.now() + 5 * 60000);
    if (vd > maxDate) {
      return res.status(400).json({ success: false, message: "\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u0633\u062c\u064a\u0644 \u0632\u064a\u0627\u0631\u0629 \u0641\u064a \u0627\u0644\u0645\u0633\u062a\u0642\u0628\u0644" });
    }
  }

  const fields = ["visitDate", "type", "notes", "nextStep"];
  const changes = [];

  fields.forEach(f => {
    if (req.body[f] !== undefined && req.body[f] !== visit[f]?.toString()) {
      const c = formatChange(visit[f], req.body[f]);
      if (c.from !== c.to) {
        changes.push({ field: f, from: c.from, to: c.to });
        visit[f] = req.body[f];
      }
    }
  });

  if (req.body.attendees && JSON.stringify(req.body.attendees) !== JSON.stringify(visit.attendees)) {
    changes.push({ field: "attendees", from: JSON.stringify(visit.attendees).substring(0,300), to: JSON.stringify(req.body.attendees).substring(0,300) });
    visit.attendees = req.body.attendees;
  }

  if (changes.length > 0) {
    visit.editHistory = visit.editHistory || [];
    visit.editHistory.push({
      editedBy: req.user._id,
      editedAt: new Date(),
      changes
    });
    if (visit.editHistory.length > 50) visit.editHistory.shift();
  }

  await visit.save();
  const v = visit.toObject();
  const hours = (Date.now() - visit.createdAt.getTime()) / 3600000;
  v.canEdit = req.user.role === "admin" || hours <= EDIT_WINDOW_HOURS;
  v.canDelete = req.user.role === "admin" || hours <= EDIT_WINDOW_HOURS;
  if (req.user.role === "engineer") delete v.editHistory;

  res.status(200).json({ success: true, data: v });
});

exports.deleteVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit || visit.isDeleted) return res.status(404).json({ success: false, message: "\u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629" });
  
  if (req.user.role === "engineer" && visit.engineer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "\u0635\u0644\u0627\u062d\u064a\u0629 \u0645\u0631\u0641\u0648\u0636\u0629" });
  }

  if (req.user.role === "engineer") {
    const hours = (Date.now() - visit.createdAt.getTime()) / 3600000;
    if (hours > EDIT_WINDOW_HOURS) {
      return res.status(403).json({ success: false, message: "\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0627\u0644\u062a\u0639\u062f\u064a\u0644 (24 \u0633\u0627\u0639\u0629)" });
    }
  }

  visit.isDeleted = true;
  visit.deletedAt = new Date();
  visit.deletedBy = req.user._id;
  await visit.save();

  res.status(200).json({ success: true, message: "\u062a\u0645 \u0627\u0644\u062d\u0630\u0641" });
});

exports.getMineSummary = require("../utils/asyncHandler")(async (req, res) => {
  const Visit = require("../models/Visit");
  const { getCairoStartOfDay, getCairoStartOfMonth } = require("../lib/dateUtils");
  const now = new Date();
  const startOfToday = getCairoStartOfDay(now);
  const startOfMonth = getCairoStartOfMonth(now);
  const startOf7Days = new Date(startOfToday.getTime() - 6 * 24 * 3600000);
  const filter = { engineer: req.user._id, isDeleted: { $ne: true } };
  const today = await Visit.countDocuments({ ...filter, visitDate: { $gte: startOfToday } });
  const last7Days = await Visit.countDocuments({ ...filter, visitDate: { $gte: startOf7Days } });
  const month = await Visit.countDocuments({ ...filter, visitDate: { $gte: startOfMonth } });
  res.status(200).json({ success: true, data: { today, last7Days, month } });
});
