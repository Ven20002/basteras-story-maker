-- Create storage bucket for newsletter assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('newsletter-assets', 'newsletter-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow anyone to upload to the bucket
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'newsletter-assets');

-- Create policy to allow anyone to read from the bucket
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'newsletter-assets');