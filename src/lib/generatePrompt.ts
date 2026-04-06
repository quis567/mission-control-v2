const PROMPT_TEMPLATES: Record<string, (page: string, details: string) => string> = {
  'Phone number': (_page, details) =>
    `Update the phone number across the entire site to ${details}. Check and update it in: the header, the footer, the contact page, any CTA sections, and any structured data / schema markup. The current number should be replaced everywhere it appears.`,

  'Address': (_page, details) =>
    `Update the business address across the entire site to ${details}. Check and update it in: the header, the footer, the contact page, the Google Maps embed if there is one, and any structured data / schema markup.`,

  'Business hours': (_page, details) =>
    `Update the business hours across the site to ${details}. Check the contact page, footer, and any structured data / schema markup.`,

  'Add photo(s)': (page, details) =>
    `${page}, add the following uploaded image(s) to the appropriate section. ${details}. Make sure images are optimized for web, use WebP format, include proper alt text, and are lazy loaded.`,

  'Remove photo(s)': (page, details) =>
    `${page}, remove the following image(s): ${details}. Remove the image file from the project as well.`,

  'Swap a photo': (page, details) =>
    `${page}, replace the existing image with the uploaded file. ${details}. Optimize the new image for web, use WebP format, and keep the same alt text structure.`,

  'Change text / copy': (page, details) =>
    `${page}, make the following text changes: ${details}. Keep the same styling and formatting as the existing content.`,

  'Add a new blog post': (_page, details) =>
    `Create a new blog post with the following content:\n\n${details}\n\nAdd proper SEO meta title and description. Add the post to the blog listing page. Use any uploaded images as the featured image or inline content images.`,

  'Add a service': (page, details) =>
    `Add a new service ${page.toLowerCase().includes('across') ? 'to the site' : `to the ${page} page`}: ${details}. Match the styling and layout of the existing services. Update the navigation if services are listed in menus.`,

  'Remove a service': (page, details) =>
    `Remove the following service ${page.toLowerCase().includes('across') ? 'from the site' : `from the ${page} page`}: ${details}. Update the navigation if the service was listed in menus.`,

  'Update pricing': (page, details) =>
    `${page}, update the pricing as follows: ${details}. Make sure any pricing shown elsewhere on the site is also updated for consistency.`,

  'Other': (page, details) =>
    `The client has requested the following change ${page.toLowerCase().includes('across') ? 'across the entire site' : `on the ${page} page`}:\n\n${details}\n\nReview and implement the requested changes. Keep the existing design style and formatting consistent.`,
};

export function generatePrompt(changeType: string, pageLocation: string, details: string, priority: string, hasFiles: boolean): string {
  const isSitewide = pageLocation === 'Header / Footer (sitewide)' || pageLocation === 'Entire site';
  const pageRef = isSitewide ? 'Across the entire site' : `On the ${pageLocation}`;

  const templateFn = PROMPT_TEMPLATES[changeType] || PROMPT_TEMPLATES['Other'];
  let prompt = templateFn(pageRef, details);

  if (hasFiles) {
    prompt += '\n\nUploaded files are attached to this request.';
  }

  if (priority === 'urgent') {
    prompt = 'URGENT REQUEST — ' + prompt;
  }

  return prompt;
}
