exports.getCompanyHistory = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });

  if (req.user.role === 'engineer' && company.region.toString() !== req.user.region.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const visits = await Visit.find({ company: company._id, isDeleted: { $ne: true } })
    .sort('-visitDate')
    .skip(skip)
    .limit(limit)
    .select('visitDate type notes nextStep attendees engineer')
    .populate({
      path: 'engineer',
      select: 'fullName profileImage.url'
    })
    .lean();

  const total = await Visit.countDocuments({ company: company._id, isDeleted: { $ne: true } });

  res.status(200).json({
    success: true,
    data: {
      company,
      visits,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});
