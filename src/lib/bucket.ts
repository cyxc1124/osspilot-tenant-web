/** Primary label: display name when set, otherwise S3 bucket name. */
export function bucketPrimaryLabel(bucket: {
  bucket_name: string;
  display_name?: string | null;
}): string {
  const display = bucket.display_name?.trim();
  return display || bucket.bucket_name;
}

/** Secondary technical name when a display name is shown. */
export function bucketSecondaryLabel(bucket: {
  bucket_name: string;
  display_name?: string | null;
}): string | null {
  const display = bucket.display_name?.trim();
  if (!display || display === bucket.bucket_name) {
    return null;
  }
  return bucket.bucket_name;
}

export function bucketSelectLabel(bucket: {
  bucket_name: string;
  display_name?: string | null;
  display_alias_only?: boolean;
}): string {
  if (bucket.display_alias_only) {
    return bucketPrimaryLabel(bucket);
  }
  const secondary = bucketSecondaryLabel(bucket);
  return secondary ? `${bucketPrimaryLabel(bucket)} (${secondary})` : bucket.bucket_name;
}
