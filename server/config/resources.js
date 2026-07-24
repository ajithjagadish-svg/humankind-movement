// Registry of downloadable lead-magnet resources (ebooks, guides, future
// program PDFs). Add an entry here for each new one - the signup route and
// mailer both look resources up by slug, so nothing else needs to change.
module.exports = {
  'postpartum-recovery-guide': {
    file: 'assets/downloads/postpartum-recovery-guide.pdf',
    attachmentName: 'Cleared-But-Not-Ready.pdf',
    subject: 'Your free guide: Cleared, But Not Ready',
    displayName: 'Cleared, But Not Ready',
  },
};
