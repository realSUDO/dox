ALTER TABLE "chunks" ADD COLUMN "content_tsv" tsvector GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED;
CREATE INDEX "chunks_content_tsv_idx" ON "chunks" USING GIN ("content_tsv");