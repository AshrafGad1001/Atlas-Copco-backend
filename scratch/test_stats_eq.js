require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('../src/models/Company');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000);
  const stalePipeline = [
    { $match: { isDeleted: { $ne: true } } },
    { $lookup: { from: 'visits', let: { compId: '$_id' }, pipeline: [
        { $match: { $expr: { $eq: ['$company', '$$compId'] }, isDeleted: { $ne: true } } },
        { $sort: { visitDate: -1 } },
        { $limit: 1 },
        { $project: { visitDate: 1 } }
      ], as: 'lastVisit' } },
    { $match: { $or: [
          { 'lastVisit.0': { $exists: false } },
          { 'lastVisit.0.visitDate': { $lt: thirtyDaysAgo } }
        ] } },
    { $count: 'count' }
  ];
  
  const staleRes = await Company.aggregate(stalePipeline);
  const staleCompanies30 = staleRes.length > 0 ? staleRes[0].count : 0;
  console.log('staleCompanies30 (Overview):', staleCompanies30);
  
  const totalRes = await Company.aggregate([...stalePipeline.slice(0, 3), { $count: 'count' }]);
  const total = totalRes.length > 0 ? totalRes[0].count : 0;
  console.log('pagination.total (StaleCompanies):', total);
  
  process.exit(0);
});
