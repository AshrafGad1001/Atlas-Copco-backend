const User = require('../models/User');
const Visit = require('../models/Visit');
const Company = require('../models/Company');
const { getCairoStartOfDay, getCairoStartOfMonth } = require('../lib/dateUtils');

exports.getEngineerStats = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password -tokenVersion');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Engineer not found' });
    }

    const now = new Date();
    const startOfToday = getCairoStartOfDay(now);
    const startOfMonth = getCairoStartOfMonth(now);
    const startOf7d = new Date(startOfToday);
    startOf7d.setDate(startOf7d.getDate() - 6);
    const startOf30d = new Date(startOfToday);
    startOf30d.setDate(startOf30d.getDate() - 29);

    const matchNotDeleted = { isDeleted: false };
    
    // Visits counts
    const visitsToday = await Visit.countDocuments({ engineer: user._id, visitDate: { $gte: startOfToday }, ...matchNotDeleted });
    const visits7d = await Visit.countDocuments({ engineer: user._id, visitDate: { $gte: startOf7d }, ...matchNotDeleted });
    const visitsMonth = await Visit.countDocuments({ engineer: user._id, visitDate: { $gte: startOfMonth }, ...matchNotDeleted });
    
    const lastVisit = await Visit.findOne({ engineer: user._id, ...matchNotDeleted }).sort('-visitDate').select('visitDate');
    const lastVisitAt = lastVisit ? lastVisit.visitDate : null;

    // Coverage logic
    const companiesInRegion = user.region ? await Company.countDocuments({ region: user.region, ...matchNotDeleted }) : 0;
    
    let visitedByHimLast30 = 0;
    if (user.region) {
      const distinctComps = await Visit.distinct('company', {
        engineer: user._id,
        visitDate: { $gte: startOf30d },
        ...matchNotDeleted
      });
      // We must only count distinct companies that belong to his region and are not deleted.
      visitedByHimLast30 = await Company.countDocuments({
        _id: { $in: distinctComps },
        region: user.region,
        ...matchNotDeleted
      });
    }

    const coveragePercent = companiesInRegion > 0 ? Math.round((visitedByHimLast30 / companiesInRegion) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        visitsToday,
        visits7d,
        visitsMonth,
        lastVisitAt,
        companiesInRegion,
        visitedByHimLast30,
        coveragePercent
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
