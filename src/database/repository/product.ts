import { Repository } from ".";
import { product } from "../schema/product";

class ProductRepository<T extends typeof product> extends Repository<T> {}

const productRepository = new ProductRepository(product);
export default productRepository;
