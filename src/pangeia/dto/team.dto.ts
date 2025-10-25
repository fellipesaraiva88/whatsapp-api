import { IsString, IsOptional, IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';

export enum MemberRole {
  LEADER = 'LEADER',
  ASSIGNED = 'ASSIGNED',
}

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class AddTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  whatsappJid: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(MemberRole)
  role: MemberRole;
}

export class UpdateTeamMemberDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
