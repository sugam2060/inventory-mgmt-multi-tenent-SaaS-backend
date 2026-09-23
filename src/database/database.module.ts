import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { databaseProvider } from './database.provider';
import { DatabaseService } from './database.service';

@Module({
	imports: [ConfigModule],
	providers: [databaseProvider, DatabaseService],
	exports: [DatabaseService],
})
export class DatabaseModule {}
