import { Repository } from "..";
import { productName } from "../../schema/product";

class ProductNameRepository<T extends typeof productName> extends Repository<T> {}

export const productNameRepository = new ProductNameRepository(productName);
