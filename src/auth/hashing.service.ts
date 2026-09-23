import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt"


@Injectable()
export class HashingService {
    private readonly SALT_ROUNDS = 10 //Balance between security and performance

    async hash(password:string): Promise<string> {
        return bcrypt.hash(password,this.SALT_ROUNDS)
    }

    async compare(password:string,hash:string): Promise<boolean> {
        return bcrypt.compare(password,hash)
    }
}