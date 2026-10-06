
const Company = require("../models/Company");
const Visit = require("../models/Visit");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { getCairoStartOfDay, getCairoStartOfMonth } = require("../lib/dateUtils");

exports.getOverview = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfToday = getCairoStartOfDay(now);
  const startOfMonth = getCairoStartOfMonth(now);
  const startOf7Days = new Date(startOfToday.getTime() - 6 * 24 * 3600000); // Today + 6 days ago
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600000);

  const visitsToday = await Visit.countDocuments({ isDeleted: { $ne: true }, visitDate: { $gte: startOfToday } });
  const visits7d = await Visit.countDocuments({ isDeleted: { $ne: true }, visitDate: { $gte: startOf7Days } });
  const visitsMonth = await Visit.countDocuments({ isDeleted: { $ne: true }, visitDate: { $gte: startOfMonth } });

  const totalCompanies = await Company.countDocuments({ isDeleted: { $ne: true } });
  
  const stalePipeline = [
    { $match: { isDeleted: { $ne: true } } },
    {
      $lookup: {
        from: 'visits',
        let: { compId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$company', '$$compId'] }, isDeleted: { $ne: true } } },
          { $sort: { visitDate: -1 } },
          { $limit: 1 },
          { $project: { visitDate: 1 } }
        ],
        as: 'lastVisit'
      }
    },
    {
      $match: {
        $or: [
          { 'lastVisit.0': { $exists: false } },
          { 'lastVisit.0.visitDate': { $lt: thirtyDaysAgo } }
        ]
      }
    },
    { $count: 'count' }
  ];
  const staleRes = await Company.aggregate(stalePipeline);
  const staleCompanies30 = staleRes.length > 0 ? staleRes[0].count : 0;

  const totalEngineers = await User.countDocuments({ role: "engineer", isActive: true });
  
  const recentEngsIds = await Visit.distinct("engineer", {
    isDeleted: { $ne: true },
    visitDate: { $gte: startOf7Days }
  });
  
  const activeEngineers = await User.countDocuments({
    _id: { $in: recentEngsIds },
    role: "engineer",
    isActive: true
  });

  res.status(200).json({
    success: true,
    data: {
      visitsToday,
      visits7d,
      visitsMonth,
      activeEngineers,
      totalEngineers,
      totalCompanies,
      staleCompanies30
    }
  });
});

exports.getEngineersStats = asyncHandler(async (req, res) => {
  const { search, region, sort, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const now = new Date();
  const startOfMonth = getCairoStartOfMonth(now);

  const match = { role: "engineer" };
  if (region) match.region = region;
  if (search) {
    match.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } }
    ];
  }

  // Find users
  const users = await User.find(match)
    .populate("region", "name")
    .lean();

  // Attach stats
  for (const u of users) {
    const primaryPhoneObj = u.phones?.find(p => p.isPrimary) || u.phones?.[0];
    u.primaryPhone = primaryPhoneObj ? primaryPhoneObj.number : null;

    u.visitsMonth = await Visit.countDocuments({
      engineer: u._id,
      isDeleted: { $ne: true },
      visitDate: { $gte: startOfMonth }
    });

    const lastV = await Visit.findOne({
      engineer: u._id,
      isDeleted: { $ne: true }
    }).sort("-visitDate").lean();
    
    u.lastVisitAt = lastV ? lastV.visitDate : null;

    // cleanup
    delete u.password;
    delete u.tokenVersion;
  }

  if (sort === "visitsMonth") {
    users.sort((a, b) => b.visitsMonth - a.visitsMonth);
  } else if (sort === "lastVisitAt") {
    users.sort((a, b) => (b.lastVisitAt || 0) - (a.lastVisitAt || 0));
  } else {
    users.sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));
  }

  const paginated = users.slice(skip, skip + Number(limit));

  res.status(200).json({
    success: true,
    data: paginated,
    pagination: {
      total: users.length,
      page: Number(page),
      limit: Number(limit)
    }
  });
});

exports.getRecentVisits = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const visits = await Visit.find({ isDeleted: { $ne: true } })
    .sort("-visitDate")
    .limit(limit)
    .populate("engineer", "fullName")
    .populate("company", "nameAr nameEn")
    .lean();
    
  res.status(200).json({ success: true, data: visits });
});

exports.getStaleCompanies = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 30;
  if (days < 7 || days > 365) {
    res.status(400);
    throw new Error("يجب أن يكون النطاق بين 7 و 365");
  }

  const { region, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const threshold = new Date(Date.now() - days * 24 * 3600000);

  const stalePipeline = [
    { $match: { isDeleted: { $ne: true } } }
  ];

  if (region) {
    const mongoose = require('mongoose');
    stalePipeline.push({ $match: { region: new mongoose.Types.ObjectId(region) } });
  }

  stalePipeline.push(
    {
      $lookup: {
        from: 'visits',
        let: { compId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$company', '$$compId'] }, isDeleted: { $ne: true } } },
          { $sort: { visitDate: -1 } },
          { $limit: 1 },
          { $project: { visitDate: 1 } }
        ],
        as: 'lastVisit'
      }
    },
    {
      $addFields: { computedLastVisitAt: { $arrayElemAt: ['$lastVisit.visitDate', 0] } }
    },
    {
      $match: {
        $or: [
          { computedLastVisitAt: { $exists: false } },
          { computedLastVisitAt: null },
          { computedLastVisitAt: { $lt: threshold } }
        ]
      }
    }
  );

  const totalRes = await Company.aggregate([...stalePipeline, { $count: 'count' }]);
  const total = totalRes.length > 0 ? totalRes[0].count : 0;

  let comps = await Company.aggregate([
    ...stalePipeline,
    { $sort: { computedLastVisitAt: 1, _id: 1 } },
    { $skip: skip },
    { $limit: Number(limit) },
    {
      $lookup: {
        from: 'regions',
        localField: 'region',
        foreignField: '_id',
        as: 'regionDoc'
      }
    },
    { $addFields: { region: { $arrayElemAt: ['$regionDoc', 0] }, id: '$_id' } },
    { $project: { regionDoc: 0, lastVisit: 0 } }
  ]);

  comps.forEach(c => {
    c.lastVisitAt = c.computedLastVisitAt || null;
  });

  res.status(200).json({
    success: true,
    data: comps,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit)
    }
  });
});

