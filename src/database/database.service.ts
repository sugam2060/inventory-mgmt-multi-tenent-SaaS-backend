import { Injectable } from '@nestjs/common';
import { Inject } from "@nestjs/common";
import {
	DATABASE_ENGINE,
	type Database,
	type DatabaseEngine,
} from "./database.provider";

@Injectable()
export class DatabaseService {
	constructor(
		@Inject(DATABASE_ENGINE)
		private readonly engine: DatabaseEngine,
	) {}

	get db(): Database {
		return this.engine.db;
	}
}
