
const asyncHandler = require("../utils/asyncHandler");

exports.getOverview = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { activeEngineers: 0, totalCompanies: 0, totalVisits: 0 } });
});

exports.getEngineersStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [] });
});

exports.getRegionsStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [] });
});

exports.getStaleCompanies = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [] });
});

exports.getRecentActivity = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [] });
});

exports.getEngineerProfileStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { totalVisits: 0, totalCompanies: 0 } });
});

