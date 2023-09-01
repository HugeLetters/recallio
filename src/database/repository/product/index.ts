import { Repository } from "..";
import { category, productName, review } from "../../schema/product";

class ProductNameRepository<T extends typeof productName> extends Repository<T> {}
export const productNameRepository = new ProductNameRepository(productName);

class CategoryRepository<T extends typeof category> extends Repository<T> {}
export const categoryRepository = new CategoryRepository(category);

class ReviewRepository<T extends typeof review> extends Repository<T> {}
export const reviewRepository = new ReviewRepository(review);
