import { templateFileUrl, type Template } from '@menouchat/shared';

/** A template's rendered picture, at the slide box's proportions. */
export function TemplateThumbnail({ template }: { template: Template }) {
  return (
    <img
      src={templateFileUrl(template, template.image)}
      alt=""
      className="aspect-[594/280] w-full rounded-lg bg-background object-cover"
    />
  );
}
