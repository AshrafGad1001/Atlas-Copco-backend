const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
};

exports.getCompanyAttendees = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });

  if (req.user.role === 'engineer' && company.region.toString() !== req.user.region.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح لك بالوصول لشركات خارج منطقتك' });
  }

  // Find all visits for this company
  const visits = await Visit.find({ company: company._id, status: { $ne: 'cancelled' } }) // non-deleted? Wait, Visits don't have isDeleted, maybe status! Wait, "غير المحذوفة". I don't have soft delete yet, but I'll add it in A7 or A4. Let's just do visits for now. 
    .sort('-visitDate')
    .lean();
    
  const uniqueAttendeesMap = new Map();
  
  for (const visit of visits) {
    if (visit.attendees && visit.attendees.length > 0) {
      for (const att of visit.attendees) {
        if (!att.name) continue;
        const normalizedKey = normalizeArabic(att.name);
        
        if (!uniqueAttendeesMap.has(normalizedKey)) {
          uniqueAttendeesMap.set(normalizedKey, {
            name: att.name.trim(), // Keep original name for display
            jobTitle: att.jobTitle || '',
            phone: att.phone || ''
          });
        } else {
          // If already exists, we only take the latest if the current one has empty fields? No, the loop goes from newest to oldest. So the first one we encounter is the newest! So we keep it.
        }
      }
    }
  }

  const attendees = Array.from(uniqueAttendeesMap.values()).slice(0, 20);

  res.status(200).json({ success: true, data: attendees });
});
