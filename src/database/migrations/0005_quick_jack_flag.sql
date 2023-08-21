CREATE TABLE `product` (
	`barcode` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	CONSTRAINT `product_barcode_name` PRIMARY KEY(`barcode`,`name`)
);
