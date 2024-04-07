DROP TRIGGER IF EXISTS "update_product_meta_on_delete_review";--> statement-breakpoint
CREATE TRIGGER "update_product_meta_on_delete_review"
	AFTER DELETE ON "review"
	FOR EACH ROW WHEN "old"."is_private" = 0
BEGIN
	update "product_meta" set "public_review_count" = MAX(0, "product_meta"."public_review_count" - 1), "public_total_rating" = MAX(0, "product_meta"."public_total_rating" - "old"."rating") where "product_meta"."barcode" = "old"."barcode";
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_product_meta_on_new_review";--> statement-breakpoint
CREATE TRIGGER "update_product_meta_on_new_review"
	AFTER INSERT ON "review"
	FOR EACH ROW WHEN "new"."is_private" = 0
BEGIN
	insert into "product_meta" ("barcode", "public_review_count", "public_total_rating") values ("new"."barcode", 1, "new"."rating") on conflict ("product_meta"."barcode") do update set "public_review_count" = "product_meta"."public_review_count" + 1, "public_total_rating" = "product_meta"."public_total_rating" + "excluded"."public_total_rating";
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_product_meta_on_update_review";--> statement-breakpoint
CREATE TRIGGER "update_product_meta_on_update_review"
	AFTER UPDATE OF "is_private" ON "review"
	FOR EACH ROW WHEN "new"."is_private" <> "old"."is_private"
BEGIN
	update "product_meta" set "public_review_count" = CASE WHEN "new"."is_private" = 0 THEN "product_meta"."public_review_count" + 1 ELSE MAX(0, "product_meta"."public_review_count" - 1) END, "public_total_rating" = CASE WHEN "new"."is_private" = 0 THEN "product_meta"."public_total_rating" + "new"."rating" ELSE MAX(0, "product_meta"."public_total_rating" - "new"."rating") END where "product_meta"."barcode" = "new"."barcode";
END;