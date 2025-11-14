import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute
} from "sequelize";

import type User from "./User";

import sequelize from "../config/database";
import { normalizeOptionalPhoneNumber, normalizePhoneNumber } from "../utils/phoneNumber";

export const JOB_SUBMISSION_FOR = ["self", "others"] as const;
export type JobSubmissionFor = (typeof JOB_SUBMISSION_FOR)[number];

class Job extends Model<InferAttributes<Job>, InferCreationAttributes<Job>> {
  declare id: CreationOptional<number>;
  declare submittedFor: JobSubmissionFor;
  declare applicantUserId: CreationOptional<number | null>;
  declare fullName: string;
  declare contactNumber: string;
  declare email: CreationOptional<string | null>;
  declare alternativeContactNumber: CreationOptional<string | null>;
  declare fullAddress: string;
  declare education: CreationOptional<string | null>;
  declare workExperience: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare resumeUrl: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare applicant?: NonAttribute<User | null>;
}

Job.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    submittedFor: {
      field: "submitted_for",
      type: DataTypes.ENUM(...JOB_SUBMISSION_FOR),
      allowNull: false
    },
    applicantUserId: {
      field: "applicant_user_id",
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    fullName: {
      field: "full_name",
      type: DataTypes.STRING(191),
      allowNull: false
    },
    contactNumber: {
      field: "contact_number",
      type: DataTypes.STRING(20),
      allowNull: false,
      set(value: string) {
        const normalized = normalizePhoneNumber(value, "contactNumber");
        this.setDataValue("contactNumber", normalized);
      }
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: true
    },
    alternativeContactNumber: {
      field: "alternative_contact_number",
      type: DataTypes.STRING(20),
      allowNull: true,
      set(value: string | null) {
        const normalized = normalizeOptionalPhoneNumber(value, "alternativeContactNumber");
        this.setDataValue("alternativeContactNumber", normalized);
      }
    },
    fullAddress: {
      field: "full_address",
      type: DataTypes.TEXT,
      allowNull: false
    },
    education: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    workExperience: {
      field: "work_experience",
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resumeUrl: {
      field: "resume_url",
      type: DataTypes.STRING(500),
      allowNull: true
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
    tableName: "tbl_job",
    modelName: "Job",
    timestamps: false
  }
);

export default Job;
