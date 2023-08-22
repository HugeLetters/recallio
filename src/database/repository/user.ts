import { Repository } from ".";
import { user } from "../schema/auth";

class UserRepository<T extends typeof user> extends Repository<T> {}

const userRepository = new UserRepository(user);
export default userRepository;
