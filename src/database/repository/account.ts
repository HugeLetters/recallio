import { Repository } from ".";
import { account } from "../schema/auth";

class AccountRepository extends Repository<typeof account> {}

const accountRepository = new AccountRepository(account);
export default accountRepository;
