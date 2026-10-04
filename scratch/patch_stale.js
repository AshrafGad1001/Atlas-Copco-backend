const fs = require('fs');

let c = fs.readFileSync('src/controllers/adminStatsController.js', 'utf8');

c = c.replace(/exports\.getStaleCompanies = asyncHandler\(async \(req, res\) => \{([\s\S]+?)\s+res\.status\(200\)\.json\(\{/m,
`exports.getStaleCompanies = asyncHandler(async (req, res) => {
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

  res.status(200).json({`);

fs.writeFileSync('src/controllers/adminStatsController.js', c);
