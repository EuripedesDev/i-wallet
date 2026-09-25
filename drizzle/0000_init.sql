CREATE TYPE "public"."transaction_type" AS ENUM('DEPOSIT', 'YIELD');--> statement-breakpoint
CREATE TABLE "cofres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"image_url" varchar(512),
	"target_value" numeric(14, 2) NOT NULL,
	"duration_months" integer,
	"monthly_deposit" numeric(14, 2),
	"is_fixed_parcels" boolean DEFAULT false NOT NULL,
	"yields_cdi" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cofre_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"parcel_number" integer,
	"date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cofres" ADD CONSTRAINT "cofres_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cofre_id_cofres_id_fk" FOREIGN KEY ("cofre_id") REFERENCES "public"."cofres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cofres_user_id_idx" ON "cofres" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_cofre_id_idx" ON "transactions" USING btree ("cofre_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_cofre_parcel_uq" ON "transactions" USING btree ("cofre_id","parcel_number");