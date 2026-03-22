import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import sequelize from "../config/database";
import { normalizeOptionalPhoneNumber } from "../utils/phoneNumber";
import type MetaBoothNumber from "./MetaBoothNumber";
import type MetaDisabilityStatus from "./MetaDisabilityStatus";
import type MetaEducationalDetail from "./MetaEducationalDetail";
import type MetaEducationalDetailGroup from "./MetaEducationalDetailGroup";
import type MetaEmployment from "./MetaEmployment";
import type MetaEmploymentGroup from "./MetaEmploymentGroup";
import type MetaEmploymentStatus from "./MetaEmploymentStatus";
import type MetaFloor from "./MetaFloor";
import type MetaGenderOption from "./MetaGenderOption";
import type MetaMainCaste from "./MetaMainCaste";
import type MetaMaritalStatus from "./MetaMaritalStatus";
import type MetaMotherTongue from "./MetaMotherTongue";
import type MetaComplaintDepartment from "./MetaComplaintDepartment";
import type MetaResidenceType from "./MetaResidenceType";
import type MetaFamilyGod from "./MetaFamilyGod";
import type MetaRelationType from "./MetaRelationType";
import type MetaReligion from "./MetaReligion";
import type MetaSubCaste from "./MetaSubCaste";
import type MetaWardNumber from "./MetaWardNumber";
import type User from "./User";

class UserProfile extends Model<
  InferAttributes<UserProfile>,
  InferCreationAttributes<UserProfile>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare displayName: CreationOptional<string | null>;
  declare alernativeContactNumber: CreationOptional<string | null>;
  declare emergencyContactNumber: CreationOptional<string | null>;
  declare aadhaarNumber: CreationOptional<string | null>;
  declare panNumber: CreationOptional<string | null>;
  declare bio: CreationOptional<string | null>;
  declare dateOfBirth: CreationOptional<Date | null>;
  declare citizenAge: CreationOptional<number | null>;
  declare genderId: CreationOptional<number | null>;
  declare educationalDetailId: CreationOptional<number | null>;
  declare educationalDetailGroupId: CreationOptional<number | null>;
  declare dateOfJoining: CreationOptional<Date | null>;
  declare maritalStatusId: CreationOptional<number | null>;
  declare employmentId: CreationOptional<number | null>;
  declare disabilityStatusId: CreationOptional<number | null>;
  declare motherTongueId: CreationOptional<number | null>;
  declare religionId: CreationOptional<number | null>;
  declare mainCasteId: CreationOptional<number | null>;
  declare subCasteId: CreationOptional<number | null>;
  declare voterIdNumber: CreationOptional<string | null>;
  declare voterIdPhoto: CreationOptional<string | null>;
  declare aadhaarPhoto: CreationOptional<string | null>;
  declare rationCardNo: CreationOptional<string | null>;
  declare rationCardPhoto: CreationOptional<string | null>;
  declare employmentGroupId: CreationOptional<number | null>;
  declare employmentTypeId: CreationOptional<number | null>;
  declare relationshipTypeId: CreationOptional<number | null>;
  declare relationshipName: CreationOptional<string | null>;
  declare residenceTypeId: CreationOptional<number | null>;
  declare nativePlace: CreationOptional<string | null>;
  declare familyGodId: CreationOptional<number | null>;
  declare doorNumber: CreationOptional<string | null>;
  declare floorId: CreationOptional<number | null>;
  declare serviceConservancyRoad: CreationOptional<string | null>;
  declare mainRoad: CreationOptional<string | null>;
  declare crossRoad: CreationOptional<string | null>;
  declare locationArea: CreationOptional<string | null>;
  declare landmark: CreationOptional<string | null>;
  declare occupation: CreationOptional<string | null>;
  declare profileImageUrl: CreationOptional<string | null>;
  declare referredBy: CreationOptional<string | null>;
  declare fullAddress: CreationOptional<string | null>;
  declare addressLine1: CreationOptional<string | null>;
  declare addressLine2: CreationOptional<string | null>;
  declare city: CreationOptional<string | null>;
  declare postalCode: CreationOptional<string | null>;
  declare country: CreationOptional<string | null>;
  declare stateId: CreationOptional<number | null>;
  declare mpConstituencyId: CreationOptional<number | null>;
  declare mlaConstituencyId: CreationOptional<number | null>;
  declare governingBody: CreationOptional<"GBA" | "TMC" | "CMC" | "GP" | null>;
  declare gramPanchayatId: CreationOptional<number | null>;
  declare mainVillageId: CreationOptional<number | null>;
  declare voterListBoothNo: CreationOptional<string | null>;
  declare voterListSlNo: CreationOptional<string | null>;
  declare mapBoothNo: CreationOptional<string | null>;
  declare mapSlNo: CreationOptional<string | null>;
  declare mapSubSlNo: CreationOptional<string | null>;
  declare wardNumberId: number | null;
  declare boothNumberId: number | null;
  declare sectorId: CreationOptional<number | null>;
  declare isRegistrationAgreed: CreationOptional<number>;
  declare latitude: CreationOptional<number | null>;
  declare longitude: CreationOptional<number | null>;
  declare socialLinksJson: CreationOptional<Record<string, unknown> | null>;
  declare preferencesJson: CreationOptional<Record<string, unknown> | null>;
  declare postsBlocked: CreationOptional<boolean>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare user?: NonAttribute<User>;
  declare gender?: NonAttribute<MetaGenderOption | null>;
  declare educationalDetail?: NonAttribute<MetaEducationalDetail | null>;
  declare educationalDetailGroup?: NonAttribute<MetaEducationalDetailGroup | null>;
  declare disabilityStatus?: NonAttribute<MetaDisabilityStatus | null>;
  declare motherTongue?: NonAttribute<MetaMotherTongue | null>;
  declare religion?: NonAttribute<MetaReligion | null>;
  declare mainCaste?: NonAttribute<MetaMainCaste | null>;
  declare subCaste?: NonAttribute<MetaSubCaste | null>;
  declare employmentStatus?: NonAttribute<MetaEmploymentStatus | null>;
  declare employmentGroup?: NonAttribute<MetaEmploymentGroup | null>;
  declare employment?: NonAttribute<MetaEmployment | null>;
  declare maritalStatus?: NonAttribute<MetaMaritalStatus | null>;
  declare residenceType?: NonAttribute<MetaResidenceType | null>;
  declare familyGod?: NonAttribute<MetaFamilyGod | null>;
  declare relationshipType?: NonAttribute<MetaRelationType | null>;
  declare floor?: NonAttribute<MetaFloor | null>;
  declare wardNumber?: NonAttribute<MetaWardNumber | null>;
  declare boothNumber?: NonAttribute<MetaBoothNumber | null>;
  declare sector?: NonAttribute<MetaComplaintDepartment | null>;
}

UserProfile.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      field: "user_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true
    },
    displayName: {
      field: "display_name",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    alernativeContactNumber: {
      field: "alernative_contact_number",
      type: DataTypes.STRING(191),
      allowNull: true,
      set(value: string | null) {
        const normalized = normalizeOptionalPhoneNumber(value, "alternativeContactNumber");
        this.setDataValue("alernativeContactNumber", normalized);
      }
    },
    emergencyContactNumber: {
      field: "emergency_contact_number",
      type: DataTypes.STRING(191),
      allowNull: true,
      set(value: string | null) {
        const normalized = normalizeOptionalPhoneNumber(value, "emergencyContactNumber");
        this.setDataValue("emergencyContactNumber", normalized);
      }
    },
    aadhaarNumber: {
      field: "aadhaar_number",
      type: DataTypes.STRING(12),
      allowNull: true
    },
    panNumber: {
      field: "pan_number",
      type: DataTypes.STRING(10),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dateOfBirth: {
      field: "date_of_birth",
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    citizenAge: {
      field: "citizen_age",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    genderId: {
      field: "gender_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    educationalDetailId: {
      field: "educational_detail_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    educationalDetailGroupId: {
      field: "educational_detail_group_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    dateOfJoining: {
      field: "date_of_joining",
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    maritalStatusId: {
      field: "marital_status_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    employmentId: {
      field: "employment_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    disabilityStatusId: {
      field: "disability_status_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    motherTongueId: {
      field: "mother_tongue_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    religionId: {
      field: "religion_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    mainCasteId: {
      field: "main_caste_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    subCasteId: {
      field: "sub_caste_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    voterIdNumber: {
      field: "voter_id_number",
      type: DataTypes.STRING(30),
      allowNull: true
    },
    voterIdPhoto: {
      field: "voter_id_photo",
      type: DataTypes.STRING(500),
      allowNull: true
    },
    aadhaarPhoto: {
      field: "aadhaar_photo",
      type: DataTypes.STRING(500),
      allowNull: true
    },
    rationCardNo: {
      field: "ration_card_no",
      type: DataTypes.STRING(30),
      allowNull: true
    },
    rationCardPhoto: {
      field: "ration_card_photo",
      type: DataTypes.STRING(500),
      allowNull: true
    },
    employmentGroupId: {
      field: "employment_group_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    employmentTypeId: {
      field: "employment_type_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    relationshipTypeId: {
      field: "relationship_type_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    relationshipName: {
      field: "relationship_name",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    residenceTypeId: {
      field: "residence_type_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    nativePlace: {
      field: "native_place",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    familyGodId: {
      field: "family_god_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    doorNumber: {
      field: "door_number",
      type: DataTypes.STRING(64),
      allowNull: true
    },
    floorId: {
      field: "floor_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    serviceConservancyRoad: {
      field: "service_conservancy_road",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    mainRoad: {
      field: "main_road",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    crossRoad: {
      field: "cross_road",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    locationArea: {
      field: "location_area",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    landmark: {
      type: DataTypes.STRING(191),
      allowNull: true
    },
    occupation: {
      type: DataTypes.STRING(191),
      allowNull: true
    },
    profileImageUrl: {
      field: "profile_image_url",
      type: DataTypes.STRING(500),
      allowNull: true
    },
    referredBy: {
      field: "referred_by",
      type: DataTypes.STRING(45),
      allowNull: true
    },
    fullAddress: {
      field: "full_address",
      type: DataTypes.TEXT,
      allowNull: true
    },
    addressLine1: {
      field: "address_line1",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    addressLine2: {
      field: "address_line2",
      type: DataTypes.STRING(191),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    postalCode: {
      field: "postal_code",
      type: DataTypes.STRING(20),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    stateId: {
      field: "state_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    mpConstituencyId: {
      field: "mp_constituency_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    mlaConstituencyId: {
      field: "mla_constituency_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    governingBody: {
      field: "governing_body",
      type: DataTypes.ENUM("GBA", "TMC", "CMC", "GP"),
      allowNull: true
    },
    gramPanchayatId: {
      field: "gram_panchayat_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    mainVillageId: {
      field: "main_village_id",
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    voterListBoothNo: {
      field: "voter_list_booth_no",
      type: DataTypes.STRING(32),
      allowNull: true
    },
    voterListSlNo: {
      field: "voter_list_sl_no",
      type: DataTypes.STRING(32),
      allowNull: true
    },
    mapBoothNo: {
      field: "map_booth_no",
      type: DataTypes.STRING(32),
      allowNull: true
    },
    mapSlNo: {
      field: "map_sl_no",
      type: DataTypes.STRING(32),
      allowNull: true
    },
    mapSubSlNo: {
      field: "map_sub_sl_no",
      type: DataTypes.STRING(32),
      allowNull: true
    },
    wardNumberId: {
      field: "ward_number_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    boothNumberId: {
      field: "booth_number_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    sectorId: {
      field: "sector_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    isRegistrationAgreed: {
      field: "is_registration_agreed",
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    socialLinksJson: {
      field: "social_links_json",
      type: DataTypes.JSON,
      allowNull: true
    },
    preferencesJson: {
      field: "preferences_json",
      type: DataTypes.JSON,
      allowNull: true
    },
    postsBlocked: {
      field: "posts_blocked",
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    createdBy: {
      field: "created_by",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    updatedBy: {
      field: "updated_by",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    createdAt: {
      field: "created_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      field: "updated_at",
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: "tbl_user_profile",
    modelName: "UserProfile",
    timestamps: false
  }
);

export default UserProfile;
