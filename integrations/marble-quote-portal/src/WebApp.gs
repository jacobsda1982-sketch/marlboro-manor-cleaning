function doGet() {
  return HtmlService
    .createTemplateFromFile('Portal')
    .evaluate()
    .setTitle(
      'Request a Cleaning Estimate | Marlboro Manor Cleaning'
    )
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1'
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}
