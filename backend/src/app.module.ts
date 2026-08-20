import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { BrandsModule } from './modules/brands/brands.module';
import { ProductsModule } from './modules/products/products.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ScriptsModule } from './modules/scripts/scripts.module';
import { GraphicReqsModule } from './modules/graphic-reqs/graphic-reqs.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { FilesModule } from './modules/files/files.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ActivityModule } from './modules/activity/activity.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SearchModule } from './modules/search/search.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { RecentAccessModule } from './modules/recent-access/recent-access.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/permissions/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    BrandsModule,
    ProductsModule,
    CalendarModule,
    ProjectsModule,
    ScriptsModule,
    GraphicReqsModule,
    TasksModule,
    ApprovalsModule,
    EquipmentModule,
    AttendanceModule,
    FilesModule,
    CommunicationsModule,
    NotificationsModule,
    ReportsModule,
    ActivityModule,
    SettingsModule,
    SearchModule,
    FavoritesModule,
    RecentAccessModule,
    PermissionsModule,
  ],
  providers: [
    // Global Guard Chain - executed in strict order on every request:
    // 1. JwtAuthGuard: Validates Bearer token → 401 if missing/invalid
    // 2. RolesGuard:   Validates @Roles() metadata → 403 if role insufficient
    // 3. PermissionsGuard: Validates @RequirePermission() metadata → 403 if permission absent
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}

