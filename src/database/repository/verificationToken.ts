import { Repository } from ".";
import { verificationToken } from "../schema/auth";

class VerificationTokenRepository<T extends typeof verificationToken> extends Repository<T> {}

const verificationTokenRepository = new VerificationTokenRepository(verificationToken);
export default verificationTokenRepository;
