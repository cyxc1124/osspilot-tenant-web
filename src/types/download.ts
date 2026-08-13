export interface DownloadPresignRequest {
  bucket_name: string;
  object_key: string;
  }

export interface DownloadPresignResponse {
  download_url: string;
  expires_in: number;
}
