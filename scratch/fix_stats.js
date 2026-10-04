const fs = require('fs');

let c = fs.readFileSync('src/controllers/adminStatsController.js', 'utf8');

c = c.replace(/const totalCompanies = await Company\.countDocuments\([^)]+\);/, 'const totalCompanies = await Company.countDocuments({ isDeleted: { $ne: true } });');

// Patch staleCompanies30 in getOverviewStats
c = c.replace(/const staleCompanies30 = await Company\.countDocuments\(\{[^}]+\$or: \[\{ lastVisitAt: \{ \$lt: thirtyDaysAgo \} \}, \{ lastVisitAt: null \}\]\n\s+\}\);/, 
`const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000);
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
  const staleCompanies30 = staleRes.length > 0 ? staleRes[0].count : 0;`);

// Patch getStaleCompanies
c = c.replace(/const total = await Company\.countDocuments\(match\);\n\s+const comps = await Company\.find\(match\)\n\s+\.sort\("lastVisitAt"\)\n\s+\.skip\(skip\)\n\s+\.limit\(Number\(limit\)\)\n\s+\.populate\("region", "name"\);/,
`const stalePipeline = [
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

  const comps = await Company.aggregate([
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
  
  // To keep compatibility with frontend expecting lastVisitAt
  comps.forEach(c => {
    c.lastVisitAt = c.computedLastVisitAt || null;
  });
`);

// wait, the original file also had `const thirtyDaysAgo = ...` in getOverviewStats already defined.
// I will just use `patchApp.js` or `replace_file_content` to make sure it doesn't duplicate.
