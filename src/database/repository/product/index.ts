import { Repository } from "..";
import { productCategory, productName } from "../../schema/product";

class ProductNameRepository<T extends typeof productName> extends Repository<T> {}
export const productNameRepository = new ProductNameRepository(productName);

class ProductCategoryRepository<T extends typeof productCategory> extends Repository<T> {}
export const productCategoryRepository = new ProductCategoryRepository(productCategory);
