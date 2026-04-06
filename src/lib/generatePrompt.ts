const PROMPT_TEMPLATES: Record<string, string> = {
  'Phone number': 'Update the phone number across the entire site to [DETAILS]. Check and update it in: the header, the footer, the contact page, any CTA sections, and any structured data / schema markup. The current number should be replaced everywhere it appears.',
  'Address': 'Update the business address across the entire site to [DETAILS]. Check and update it in: the header, the footer, the contact page, the Google Maps embed if there is one, and any structured data / schema markup.',
  'Business hours': 'Update the business hours across the site to [DETAILS]. Check the contact page, footer, and any structured data / schema markup.',
  'Add photo(s)': 'On the [PAGE] page, add the following uploaded image(s) to the appropriate section. [DETAILS]. Make sure images are optimized for web, use WebP format, include proper alt text, and are lazy loaded.',
  'Remove photo(s)': 'On the [PAGE] page, remove the following image(s): [DETAILS]. Remove the image file from the project as well.',
  'Swap a photo': 'On the [PAGE] page, replace the existing image with the uploaded file. [DETAILS]. Optimize the new image for web, use WebP format, and keep the same alt text structure.',
  'Change text / copy': 'On the [PAGE] page, make the following text changes: [DETAILS]. Keep the same styling and formatting as the existing content.',
  'Add a new blog post': 'Create a new blog post with the following content:\n\n[DETAILS]\n\nAdd proper SEO meta title and description. Add the post to the blog listing page. Use any uploaded images as the featured image or inline content images.',
  'Add a service': 'Add a new service to the [PAGE] page: [DETAILS]. Match the styling and layout of the existing services. Update the navigation if services are listed in menus.',
  'Remove a service': 'Remove the following service from the [PAGE] page: [DETAILS]. Update the navigation if the service was listed in menus.',
  'Update pricing': 'On the [PAGE] page, update the pricing as follows: [DETAILS]. Make sure any pricing shown elsewhere on the site is also updated for consistency.',
  'Other': 'The client has requested the following change on the [PAGE] page:\n\n[DETAILS]\n\nReview and implement the requested changes. Keep the existing design style and formatting consistent.',
};

export function generatePrompt(changeType: string, pageLocation: string, details: string, priority: string, hasFiles: boolean): string {
  let template = PROMPT_TEMPLATES[changeType] || PROMPT_TEMPLATES['Other'];

  // Handle sitewide locations
  const isSitewide = pageLocation === 'Header / Footer (sitewide)' || pageLocation === 'Entire site';
  const pageRef = isSitewide ? 'across the entire site' : pageLocation;

  template = template.replace(/On the \[PAGE\] page, /g, isSitewide ? 'Across the entire site, ' : `On the ${pageRef} page, `);
  template = template.replace(/to the \[PAGE\] page/g, isSitewide ? 'across the entire site' : `to the ${pageRef} page`);
  template = template.replace(/from the \[PAGE\] page/g, isSitewide ? 'from across the entire site' : `from the ${pageRef} page`);
  template = template.replace(/on the \[PAGE\] page/g, isSitewide ? 'across the entire site' : `on the ${pageRef} page`);
  template = template.replace('[DETAILS]', details);

  if (hasFiles) {
    template += '\n\nUploaded files are attached to this request.';
  }

  if (priority === 'urgent') {
    template = 'URGENT REQUEST — ' + template;
  }

  return template;
}
