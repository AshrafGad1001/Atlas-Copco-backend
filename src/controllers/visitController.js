const { z } = require("zod");
const Visit = require("../models/Visit");
const Company = require("../models/Company");
const asyncHandler = require("../utils/asyncHandler");

const EDIT_WINDOW_HOURS = 24;

exports.visitSchema = z.object({
  company: z.string().min(1, "الشركة مطلوبة").optional(),
  visitDate: z.string().optional(),
  type: z.string().optional(),
  notes: z.string().optional(),
  nextStep: z.string().optional(),
  followUp: z.object({ dueDate: z.string(), note: z.string().max(200, "أقصى طول 200 حرف").optional(), done: z.boolean().optional() }).optional(),
  status: z.enum(["planned", "completed", "cancelled"]).optional(),
  attendees: z.array(z.object({
    name: z.string().min(2, "الاسم مطلوب").max(100),
    jobTitle: z.string().max(100).optional().or(z.literal("")),
    phone: z.string().regex(/^[0-9+]{8,15}$/, "رقم صحيح").optional().or(z.literal(""))
  })).max(10, "الحد الأقصى 10").optional()
});

function getFollowUpStatus(fu, now = new Date()) {
  if (!fu || !fu.dueDate) return null;
  if (fu.done) return 'done';
  const { getCairoStartOfDay } = require("../lib/dateUtils");
  const today = getCairoStartOfDay(now);
  const due = getCairoStartOfDay(new Date(fu.dueDate));
  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

function injectFollowUpStatus(visit, now) {
  if (visit && visit.followUp && visit.followUp.dueDate) {
    visit.followUp.status = getFollowUpStatus(visit.followUp, now);
  }
  return visit;
}

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
  
  if (req.body.followUp && req.body.followUp.dueDate) {
    const { getCairoStartOfDay } = require("../lib/dateUtils");
    const today = getCairoStartOfDay(new Date());
    const vDate = getCairoStartOfDay(new Date(req.body.visitDate || new Date()));
    const due = getCairoStartOfDay(new Date(req.body.followUp.dueDate));
    
    if (due < vDate) {
      return res.status(400).json({ success: false, message: 'تاريخ المتابعة يجب أن يكون بعد أو في نفس يوم الزيارة' });
    }
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 365);
    if (due > maxDate) {
      return res.status(400).json({ success: false, message: 'تاريخ المتابعة أقصاه 365 يوم من اليوم' });
    }
    req.body.followUp.dueDate = due;
  }

  if (!req.body.company) return res.status(400).json({ success: false, message: "الشركة مطلوبة" });
  
  const company = await Company.findById(req.body.company);
  if (!company || company.isDeleted) return res.status(404).json({ success: false, message: "شركة غير موجودة" });
  
  if (req.user.role === "engineer" && company.region.toString() !== req.user.region.toString()) {
    return res.status(403).json({ success: false, message: "ليس لديك صلاحية" });
  }

  if (req.body.visitDate) {
    const vd = new Date(req.body.visitDate);
    const maxDate = new Date(Date.now() + 5 * 60000);
    if (vd > maxDate) {
      return res.status(400).json({ success: false, message: "لا يمكن تسجيل زيارة في المستقبل" });
    }
  }

  let visit = await Visit.create(req.body);
  visit = await visit.populate('engineer', 'fullName profileImage.url');
  const v = visit.toObject();
  injectFollowUpStatus(v, new Date());
  res.status(201).json({ success: true, data: v });
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
    
  const now = new Date();
  const mapped = visits.map(v => {
    const hours = (Date.now() - new Date(v.createdAt).getTime()) / 3600000;
    v.canEdit = req.user.role === "admin" || hours <= EDIT_WINDOW_HOURS;
    v.canDelete = req.user.role === "admin" || hours <= EDIT_WINDOW_HOURS;
    if (req.user.role === "engineer") delete v.editHistory;
    return injectFollowUpStatus(v, now);
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

  const now = new Date();
  const mapped = visits.map(v => {
    v.canEdit = true;
    v.canDelete = true;
    return injectFollowUpStatus(v, now);
  });

  res.status(200).json({ success: true, data: mapped, pagination: { total, page, pages: Math.ceil(total / limit) } });
});

exports.getVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findOne({ _id: req.params.id, isDeleted: false })
    .populate("company", "nameAr nameEn region")
    .populate("engineer", "fullName region");

  if (!visit) return res.status(404).json({ success: false, message: "غير موجودة" });

  if (req.user.role === "engineer" && visit.engineer._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "صلاحية مرفوضة" });
  }

  const hours = (Date.now() - visit.createdAt.getTime()) / 3600000;
  const v = visit.toObject();
  v.canEdit = req.user.role === "admin" || hours <= EDIT_WINDOW_HOURS;
  v.canDelete = req.user.role === "admin" || hours <= EDIT_WINDOW_HOURS;
  if (req.user.role === "engineer") delete v.editHistory;

  injectFollowUpStatus(v, new Date());
  res.status(200).json({ success: true, data: v });
});

exports.updateVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit || visit.isDeleted) return res.status(404).json({ success: false, message: "غير موجودة" });

  if (req.user.role === "engineer" && visit.engineer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "صلاحية مرفوضة" });
  }

  if (req.user.role === "engineer") {
    const hours = (Date.now() - visit.createdAt.getTime()) / 3600000;
    if (hours > EDIT_WINDOW_HOURS) {
      return res.status(403).json({ success: false, message: "انتهت مهلة التعديل (24 ساعة)" });
    }
  }

  if (req.body.visitDate) {
    const vd = new Date(req.body.visitDate);
    const maxDate = new Date(Date.now() + 5 * 60000);
    if (vd > maxDate) {
      return res.status(400).json({ success: false, message: "لا يمكن تسجيل زيارة في المستقبل" });
    }
  }

  if (req.body.followUp && req.body.followUp.dueDate) {
    const { getCairoStartOfDay } = require("../lib/dateUtils");
    const today = getCairoStartOfDay(new Date());
    const vDate = getCairoStartOfDay(new Date(req.body.visitDate || visit.visitDate));
    const due = getCairoStartOfDay(new Date(req.body.followUp.dueDate));
    
    if (due < vDate) {
      return res.status(400).json({ success: false, message: 'تاريخ المتابعة يجب أن يكون بعد أو في نفس يوم الزيارة' });
    }
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 365);
    if (due > maxDate) {
      return res.status(400).json({ success: false, message: 'تاريخ المتابعة أقصاه 365 يوم من اليوم' });
    }
    
    req.body.followUp.dueDate = due;
    if (visit.followUp && visit.followUp.done) {
      req.body.followUp.done = true;
      req.body.followUp.doneAt = visit.followUp.doneAt;
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
  
  if (req.body.followUp) {
     const fOrig = visit.followUp ? { dueDate: visit.followUp.dueDate, note: visit.followUp.note } : null;
     const fNew = { dueDate: req.body.followUp.dueDate, note: req.body.followUp.note };
     if (JSON.stringify(fOrig) !== JSON.stringify(fNew)) {
       changes.push({ field: "followUp", from: JSON.stringify(fOrig), to: JSON.stringify(fNew) });
       visit.followUp = { ...visit.followUp, ...req.body.followUp };
     }
  }

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

  injectFollowUpStatus(v, new Date());
  res.status(200).json({ success: true, data: v });
});

exports.deleteVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit || visit.isDeleted) return res.status(404).json({ success: false, message: "غير موجودة" });
  
  if (req.user.role === "engineer" && visit.engineer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "صلاحية مرفوضة" });
  }

  if (req.user.role === "engineer") {
    const hours = (Date.now() - visit.createdAt.getTime()) / 3600000;
    if (hours > EDIT_WINDOW_HOURS) {
      return res.status(403).json({ success: false, message: "انتهت مهلة التعديل (24 ساعة)" });
    }
  }

  visit.isDeleted = true;
  visit.deletedAt = new Date();
  visit.deletedBy = req.user._id;
  await visit.save();

  res.status(200).json({ success: true, message: "تم الحذف" });
});

exports.getMineSummary = require("../utils/asyncHandler")(async (req, res) => {
  const { getCairoStartOfDay, getCairoStartOfMonth } = require("../lib/dateUtils");
  const now = new Date();
  const startOfToday = getCairoStartOfDay(now);
  const startOfMonth = getCairoStartOfMonth(now);
  const startOf7Days = new Date(startOfToday.getTime() - 6 * 24 * 3600000);
  const filter = { engineer: req.user._id, isDeleted: { $ne: true } };
  const today = await Visit.countDocuments({ ...filter, visitDate: { $gte: startOfToday } });
  const last7Days = await Visit.countDocuments({ ...filter, visitDate: { $gte: startOf7Days } });
  const month = await Visit.countDocuments({ ...filter, visitDate: { $gte: startOfMonth } });
  
  const followUpFilter = { ...filter, 'followUp.dueDate': { $exists: true }, 'followUp.done': { $ne: true } };
  const todayDue = await Visit.countDocuments({ ...followUpFilter, 'followUp.dueDate': startOfToday });
  const overdue = await Visit.countDocuments({ ...followUpFilter, 'followUp.dueDate': { $lt: startOfToday } });
  const upcoming = await Visit.countDocuments({ ...followUpFilter, 'followUp.dueDate': { $gt: startOfToday } });
  res.status(200).json({ success: true, data: { today, last7Days, month, followUps: { today: todayDue, overdue, upcoming } } });

});


exports.getMineFollowUps = asyncHandler(async (req, res) => {
  const { getCairoStartOfDay } = require("../lib/dateUtils");
  const today = getCairoStartOfDay(new Date());

  const filter = { engineer: req.user._id, isDeleted: false, 'followUp.dueDate': { $exists: true }, 'followUp.done': { $ne: true } };

  if (req.query.status) {
    if (req.query.status === 'overdue') {
      filter['followUp.dueDate'] = { $lt: today };
    } else if (req.query.status === 'today') {
      filter['followUp.dueDate'] = today;
    } else if (req.query.status === 'upcoming') {
      filter['followUp.dueDate'] = { $gt: today };
    }
  }

  const visits = await Visit.find(filter)
    .populate("company", "nameAr nameEn region")
    .sort({ "followUp.dueDate": 1 })
    .lean();

  const now = new Date();
  const mapped = visits.map(v => injectFollowUpStatus(v, now));

  res.status(200).json({ success: true, data: mapped });
});

exports.getAdminFollowUps = asyncHandler(async (req, res) => {
  const { getCairoStartOfDay } = require("../lib/dateUtils");
  const today = getCairoStartOfDay(new Date());

  const filter = { isDeleted: false, 'followUp.dueDate': { $exists: true }, 'followUp.done': { $ne: true } };

  if (req.query.engineer) filter.engineer = req.query.engineer;
  if (req.query.status) {
    if (req.query.status === 'overdue') {
      filter['followUp.dueDate'] = { $lt: today };
    } else if (req.query.status === 'today') {
      filter['followUp.dueDate'] = today;
    } else if (req.query.status === 'upcoming') {
      filter['followUp.dueDate'] = { $gt: today };
    }
  }
  
  if (req.query.region) {
    const Company = require('../models/Company');
    const comps = await Company.find({ region: req.query.region }).select("_id").lean();
    filter.company = { $in: comps.map(c => c._id) };
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const total = await Visit.countDocuments(filter);
  const visits = await Visit.find(filter)
    .populate("company", "nameAr nameEn region")
    .populate("engineer", "fullName")
    .sort({ "followUp.dueDate": 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const now = new Date();
  const mapped = visits.map(v => injectFollowUpStatus(v, now));

  res.status(200).json({ success: true, data: mapped, pagination: { total, page, Math: Math.ceil(total / limit) } });
});


exports.upsertFollowUp = asyncHandler(async (req, res, next) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
  if (req.user.role === 'engineer' && visit.engineer.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const { dueDate, note } = req.body;
  if (!dueDate) return res.status(400).json({ success: false, message: 'dueDate is required' });
  
  const vDate = new Date(visit.visitDate);
  const dDate = new Date(dueDate);
  if (dDate < vDate) return res.status(400).json({ success: false, message: 'Due date cannot be before visit date' });
  const maxDate = new Date(vDate);
  maxDate.setDate(maxDate.getDate() + 365);
  if (dDate > maxDate) return res.status(400).json({ success: false, message: 'Due date cannot be more than a year after visit date' });

  visit.followUp = { dueDate, note: note || '', done: false };
  await visit.save();
  res.status(200).json({ success: true, data: visit });
});

exports.patchFollowUp = asyncHandler(async (req, res, next) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
  if (req.user.role === 'engineer' && visit.engineer.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  if (!visit.followUp || !visit.followUp.dueDate) {
    return res.status(400).json({ success: false, message: 'Visit has no follow-up' });
  }

  if (req.body.done !== undefined) visit.followUp.done = req.body.done;
  if (req.body.note !== undefined) visit.followUp.note = req.body.note;
  if (req.body.dueDate) {
    const vDate = new Date(visit.visitDate);
    const dDate = new Date(req.body.dueDate);
    if (dDate < vDate) return res.status(400).json({ success: false, message: 'Due date cannot be before visit date' });
    visit.followUp.dueDate = req.body.dueDate;
  }
  
  await visit.save();
  res.status(200).json({ success: true, data: visit });
});

exports.deleteFollowUp = asyncHandler(async (req, res, next) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
  if (req.user.role === 'engineer' && visit.engineer.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  visit.followUp = undefined;
  await visit.save();
  res.status(200).json({ success: true, data: visit });
});


const cloudinary = require('../lib/cloudinary');
const streamifier = require('streamifier');

exports.uploadPhotos = asyncHandler(async (req, res, next) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
  if (req.user.role === 'engineer' && visit.engineer.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No photos provided' });
  }

  if (visit.photos.length + req.files.length > 5) {
    return res.status(400).json({ success: false, message: 'Maximum 5 photos allowed per visit' });
  }

  const uploadPromises = req.files.map(file => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: 'atlas-copco-visits' }, (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      });
      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  });

  try {
    const urls = await Promise.all(uploadPromises);
    visit.photos.push(...urls);
    await visit.save();
    res.status(200).json({ success: true, data: visit });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

exports.deletePhoto = asyncHandler(async (req, res, next) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
  if (req.user.role === 'engineer' && visit.engineer.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'Photo URL required' });

  visit.photos = visit.photos.filter(p => p !== url);
  await visit.save();
  
  // Optional: Delete from cloudinary (extract public_id from url if needed)
  
  res.status(200).json({ success: true, data: visit });
});
