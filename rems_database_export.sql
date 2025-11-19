--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (84ade85)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: deposit_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.deposit_type AS ENUM (
    'rent_deposit',
    'water_deposit',
    'electricity_deposit',
    'security_deposit',
    'other'
);


ALTER TYPE public.deposit_type OWNER TO neondb_owner;

--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.invoice_status AS ENUM (
    'draft',
    'sent',
    'paid',
    'overdue',
    'cancelled'
);


ALTER TYPE public.invoice_status OWNER TO neondb_owner;

--
-- Name: lease_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.lease_status AS ENUM (
    'active',
    'expired',
    'terminated',
    'pending'
);


ALTER TYPE public.lease_status OWNER TO neondb_owner;

--
-- Name: maintenance_category; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.maintenance_category AS ENUM (
    'plumbing',
    'electrical',
    'hvac',
    'appliance',
    'structural',
    'other'
);


ALTER TYPE public.maintenance_category OWNER TO neondb_owner;

--
-- Name: maintenance_priority; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.maintenance_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);


ALTER TYPE public.maintenance_priority OWNER TO neondb_owner;

--
-- Name: maintenance_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.maintenance_status AS ENUM (
    'open',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE public.maintenance_status OWNER TO neondb_owner;

--
-- Name: management_fee_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.management_fee_type AS ENUM (
    'fixed_amount',
    'percentage_of_rent'
);


ALTER TYPE public.management_fee_type OWNER TO neondb_owner;

--
-- Name: mpesa_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.mpesa_type AS ENUM (
    'paybill',
    'till_number'
);


ALTER TYPE public.mpesa_type OWNER TO neondb_owner;

--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'check',
    'bank_transfer',
    'credit_card',
    'mpesa',
    'online'
);


ALTER TYPE public.payment_method OWNER TO neondb_owner;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.payment_status AS ENUM (
    'paid',
    'pending',
    'overdue',
    'failed'
);


ALTER TYPE public.payment_status OWNER TO neondb_owner;

--
-- Name: penalty_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.penalty_type AS ENUM (
    'fixed_amount',
    'percentage_of_rent',
    'percentage_of_balance'
);


ALTER TYPE public.penalty_type OWNER TO neondb_owner;

--
-- Name: property_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.property_status AS ENUM (
    'active',
    'inactive',
    'maintenance'
);


ALTER TYPE public.property_status OWNER TO neondb_owner;

--
-- Name: property_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.property_type AS ENUM (
    'apartment_complex',
    'single_family',
    'duplex',
    'commercial',
    'townhouse'
);


ALTER TYPE public.property_type OWNER TO neondb_owner;

--
-- Name: recurring_fee_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.recurring_fee_type AS ENUM (
    'garbage',
    'parking',
    'security',
    'internet',
    'service_fee',
    'water',
    'other'
);


ALTER TYPE public.recurring_fee_type OWNER TO neondb_owner;

--
-- Name: request_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.request_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.request_status OWNER TO neondb_owner;

--
-- Name: unit_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.unit_status AS ENUM (
    'vacant',
    'occupied',
    'maintenance',
    'reserved',
    'under_renovation'
);


ALTER TYPE public.unit_status OWNER TO neondb_owner;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'landlord',
    'property_manager',
    'agent',
    'tenant'
);


ALTER TYPE public.user_role OWNER TO neondb_owner;

--
-- Name: audit_trigger_function(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.audit_trigger_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN
          IF TG_OP = 'DELETE' THEN
            INSERT INTO audit_logs (table_name, operation, old_values)
            VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD));
            RETURN OLD;
          ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO audit_logs (table_name, operation, old_values, new_values)
            VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW));
            RETURN NEW;
          ELSIF TG_OP = 'INSERT' THEN
            INSERT INTO audit_logs (table_name, operation, new_values)
            VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW));
            RETURN NEW;
          END IF;
          RETURN NULL;
        END;
        $$;


ALTER FUNCTION public.audit_trigger_function() OWNER TO neondb_owner;

--
-- Name: check_user_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.check_user_permission(user_id uuid, required_role text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
        DECLARE
          user_role TEXT;
        BEGIN
          SELECT role INTO user_role FROM users WHERE id = user_id AND is_active = true;
          
          IF user_role IS NULL THEN
            RETURN FALSE;
          END IF;
          
          -- Role hierarchy: super_admin > landlord > property_manager > agent > tenant
          CASE required_role
            WHEN 'tenant' THEN
              RETURN user_role IN ('tenant', 'agent', 'property_manager', 'landlord', 'super_admin');
            WHEN 'agent' THEN
              RETURN user_role IN ('agent', 'property_manager', 'landlord', 'super_admin');
            WHEN 'property_manager' THEN
              RETURN user_role IN ('property_manager', 'landlord', 'super_admin');
            WHEN 'landlord' THEN
              RETURN user_role IN ('landlord', 'super_admin');
            WHEN 'super_admin' THEN
              RETURN user_role = 'super_admin';
            ELSE
              RETURN FALSE;
          END CASE;
        END;
        $$;


ALTER FUNCTION public.check_user_permission(user_id uuid, required_role text) OWNER TO neondb_owner;

--
-- Name: decrypt_sensitive_data(text, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.decrypt_sensitive_data(encrypted_data text, key text DEFAULT 'default_encryption_key'::text) RETURNS text
    LANGUAGE plpgsql
    AS $$
        BEGIN
          RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), key::bytea, 'aes'), 'UTF8');
        END;
        $$;


ALTER FUNCTION public.decrypt_sensitive_data(encrypted_data text, key text) OWNER TO neondb_owner;

--
-- Name: encrypt_sensitive_data(text, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.encrypt_sensitive_data(data text, key text DEFAULT 'default_encryption_key'::text) RETURNS text
    LANGUAGE plpgsql
    AS $$
        BEGIN
          RETURN encode(encrypt(data::bytea, key::bytea, 'aes'), 'base64');
        END;
        $$;


ALTER FUNCTION public.encrypt_sensitive_data(data text, key text) OWNER TO neondb_owner;

--
-- Name: log_security_event(text, uuid, jsonb, inet); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.log_security_event(event_type text, user_id uuid, details jsonb, ip_address inet DEFAULT NULL::inet) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
        BEGIN
          INSERT INTO audit_logs (
            table_name, 
            operation, 
            new_values, 
            user_id, 
            client_ip,
            timestamp
          ) VALUES (
            'security_events',
            event_type,
            details,
            user_id,
            ip_address,
            CURRENT_TIMESTAMP
          );
        END;
        $$;


ALTER FUNCTION public.log_security_event(event_type text, user_id uuid, details jsonb, ip_address inet) OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id character varying(255) NOT NULL,
    action character varying(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    user_id uuid,
    user_email character varying(255),
    user_role character varying(50),
    ip_address character varying(45),
    user_agent text,
    reason text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_log_action_check CHECK (((action)::text = ANY ((ARRAY['CREATE'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying, 'SOFT_DELETE'::character varying, 'RESTORE'::character varying])::text[])))
);


ALTER TABLE public.audit_log OWNER TO neondb_owner;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    table_name character varying(50) NOT NULL,
    operation character varying(10) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    user_id uuid,
    user_role character varying(20),
    client_ip inet,
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    session_id character varying(255)
);


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO neondb_owner;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    invoice_number character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date timestamp without time zone NOT NULL,
    status public.invoice_status DEFAULT 'draft'::public.invoice_status,
    description text NOT NULL,
    items_json text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO neondb_owner;

--
-- Name: leases; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.leases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    monthly_rent numeric(10,2) NOT NULL,
    security_deposit numeric(10,2),
    status public.lease_status DEFAULT 'pending'::public.lease_status,
    terms text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    move_in_date timestamp without time zone,
    move_out_date timestamp without time zone,
    move_out_notice_date timestamp without time zone,
    move_out_reason text,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by uuid,
    CONSTRAINT chk_lease_duration CHECK ((start_date < COALESCE(end_date, (start_date + '10 years'::interval))))
);


ALTER TABLE public.leases OWNER TO neondb_owner;

--
-- Name: maintenance_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.maintenance_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    tenant_id uuid,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    category public.maintenance_category NOT NULL,
    priority public.maintenance_priority DEFAULT 'normal'::public.maintenance_priority,
    status public.maintenance_status DEFAULT 'open'::public.maintenance_status,
    assigned_to uuid,
    estimated_cost numeric(10,2),
    actual_cost numeric(10,2),
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.maintenance_requests OWNER TO neondb_owner;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    lease_id uuid,
    unit_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    due_date timestamp without time zone NOT NULL,
    payment_method public.payment_method NOT NULL,
    status public.payment_status DEFAULT 'pending'::public.payment_status,
    description text,
    transaction_id character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    mpesa_phone_number character varying(15),
    mpesa_checkout_request_id character varying(100),
    mpesa_transaction_id character varying(50),
    mpesa_receipt_number character varying(50),
    CONSTRAINT chk_payment_amount_range CHECK (((amount > (0)::numeric) AND (amount <= (10000000)::numeric)))
);


ALTER TABLE public.payments OWNER TO neondb_owner;

--
-- Name: properties; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    type public.property_type NOT NULL,
    address text NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    zip_code character varying(20),
    description text,
    total_units integer DEFAULT 0 NOT NULL,
    status public.property_status DEFAULT 'active'::public.property_status,
    purchase_price numeric(12,2),
    purchase_date timestamp without time zone,
    owner_id uuid,
    manager_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    water_rate numeric(10,2),
    electricity_rate numeric(10,2),
    mpesa_type public.mpesa_type,
    mpesa_paybill_number character varying(20),
    mpesa_account_number character varying(50),
    mpesa_store_number character varying(20),
    mpesa_till_number character varying(20),
    rent_penalty_type public.penalty_type,
    rent_penalty_amount numeric(10,2),
    tax_rate numeric(5,2) DEFAULT 7.5,
    management_fee_type public.management_fee_type,
    management_fee_amount numeric(10,2),
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by uuid
);


ALTER TABLE public.properties OWNER TO neondb_owner;

--
-- Name: property_recurring_fees; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.property_recurring_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    fee_type public.recurring_fee_type NOT NULL,
    amount numeric(10,2) NOT NULL,
    description character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.property_recurring_fees OWNER TO neondb_owner;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.schema_migrations (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    version character varying(50) NOT NULL,
    checksum character varying(64) NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    execution_time integer,
    rollback_sql text
);


ALTER TABLE public.schema_migrations OWNER TO neondb_owner;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: tenant_deposits; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tenant_deposits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    lease_id uuid NOT NULL,
    deposit_type public.deposit_type NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    amount_returned numeric(10,2) DEFAULT 0,
    return_date timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tenant_deposits OWNER TO neondb_owner;

--
-- Name: tenant_documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tenant_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    document_type character varying(100) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    uploaded_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tenant_documents OWNER TO neondb_owner;

--
-- Name: tenant_gadgets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tenant_gadgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    lease_id uuid NOT NULL,
    item_name character varying(255) NOT NULL,
    description text,
    serial_number character varying(100),
    condition character varying(100),
    is_returned boolean DEFAULT false,
    return_date timestamp without time zone,
    return_condition character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tenant_gadgets OWNER TO neondb_owner;

--
-- Name: unit_recurring_fees; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.unit_recurring_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    fee_type public.recurring_fee_type NOT NULL,
    amount numeric(10,2) NOT NULL,
    description character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.unit_recurring_fees OWNER TO neondb_owner;

--
-- Name: units; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    unit_number character varying(50) NOT NULL,
    bedrooms integer DEFAULT 0,
    bathrooms numeric(3,1) DEFAULT '0'::numeric,
    square_feet integer,
    monthly_rent numeric(10,2) NOT NULL,
    security_deposit numeric(10,2),
    status public.unit_status DEFAULT 'vacant'::public.unit_status,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    unit_size character varying(50),
    tax_rate numeric(5,2),
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by uuid
);


ALTER TABLE public.units OWNER TO neondb_owner;

--
-- Name: user_access_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_access_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    requested_role public.user_role NOT NULL,
    reason text,
    status public.request_status DEFAULT 'pending'::public.request_status,
    reviewed_by uuid,
    reviewed_at timestamp without time zone,
    review_notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_access_requests OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    role public.user_role DEFAULT 'tenant'::public.user_role NOT NULL,
    phone character varying(20),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    replit_id character varying,
    username character varying(50),
    password_hash character varying(255),
    is_approved boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp without time zone,
    national_id character varying(50),
    kra_pin character varying(20),
    alternate_phone character varying(20),
    emergency_contact_name character varying(200),
    emergency_contact_phone character varying(20),
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by uuid,
    CONSTRAINT chk_email_format CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,}$'::text)),
    CONSTRAINT chk_password_strength CHECK ((length((password_hash)::text) >= 60))
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_log (id, table_name, record_id, action, old_data, new_data, user_id, user_email, user_role, ip_address, user_agent, reason, "timestamp") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_logs (id, table_name, operation, old_values, new_values, user_id, user_role, client_ip, user_agent, "timestamp", session_id) FROM stdin;
1	properties	INSERT	\N	{"id": "3a958191-0d1a-4830-b328-a98890eb2d31", "city": "Nairobi", "name": "Test Property", "type": "apartment_complex", "state": "Nairobi", "status": "active", "address": "123 Test St", "owner_id": null, "tax_rate": 7.50, "zip_code": null, "created_at": "2025-08-28T12:11:29.939642", "manager_id": null, "mpesa_type": null, "updated_at": "2025-08-28T12:11:29.939642", "water_rate": null, "description": null, "total_units": 5, "purchase_date": null, "purchase_price": null, "electricity_rate": null, "mpesa_till_number": null, "rent_penalty_type": null, "mpesa_store_number": null, "management_fee_type": null, "rent_penalty_amount": null, "mpesa_account_number": null, "mpesa_paybill_number": null, "management_fee_amount": null}	\N	\N	\N	\N	2025-08-28 12:11:29.939642+00	\N
2	units	INSERT	\N	{"id": "fe13b58b-d2f4-4571-94d7-f2b2cb4bdb40", "status": "vacant", "bedrooms": 2, "tax_rate": null, "bathrooms": 1.0, "unit_size": null, "created_at": "2025-08-28T12:12:50.045784", "updated_at": "2025-08-28T12:12:50.045784", "description": null, "property_id": "3a958191-0d1a-4830-b328-a98890eb2d31", "square_feet": null, "unit_number": "101", "monthly_rent": 25000.00, "security_deposit": null}	\N	\N	\N	\N	2025-08-28 12:12:50.045784+00	\N
3	maintenance_requests	INSERT	\N	{"id": "2d45298a-873a-46e3-b466-8cc6c996e111", "title": "Test Plumbing Issue", "status": "open", "unit_id": "fe13b58b-d2f4-4571-94d7-f2b2cb4bdb40", "category": "plumbing", "priority": "normal", "tenant_id": null, "created_at": "2025-08-28T12:12:59.952576", "updated_at": "2025-08-28T12:12:59.952576", "actual_cost": null, "assigned_to": null, "description": "Leaky faucet in bathroom", "completed_at": null, "estimated_cost": null}	\N	\N	\N	\N	2025-08-28 12:12:59.952576+00	\N
4	users	INSERT	\N	{"id": "e760dc1e-a92b-4aac-9b17-7e06c4443f02", "role": "tenant", "email": "jane.smith.test@example.com", "phone": "+254700987654", "kra_pin": null, "username": null, "is_active": true, "last_name": "Smith", "replit_id": null, "created_at": "2025-08-28T12:13:27.462094", "first_name": "Jane", "updated_at": "2025-08-28T12:13:27.462094", "approved_at": null, "approved_by": null, "is_approved": false, "national_id": "87654321", "password_hash": null, "alternate_phone": null, "emergency_contact_name": null, "emergency_contact_phone": null}	\N	\N	\N	\N	2025-08-28 12:13:27.462094+00	\N
5	properties	UPDATE	{"id": "3a958191-0d1a-4830-b328-a98890eb2d31", "city": "Nairobi", "name": "Test Property", "type": "apartment_complex", "state": "Nairobi", "status": "active", "address": "123 Test St", "owner_id": null, "tax_rate": 7.50, "zip_code": null, "created_at": "2025-08-28T12:11:29.939642", "manager_id": null, "mpesa_type": null, "updated_at": "2025-08-28T12:11:29.939642", "water_rate": null, "description": null, "total_units": 5, "purchase_date": null, "purchase_price": null, "electricity_rate": null, "mpesa_till_number": null, "rent_penalty_type": null, "mpesa_store_number": null, "management_fee_type": null, "rent_penalty_amount": null, "mpesa_account_number": null, "mpesa_paybill_number": null, "management_fee_amount": null}	{"id": "3a958191-0d1a-4830-b328-a98890eb2d31", "city": "Nairobi", "name": "Updated Test Property", "type": "apartment_complex", "state": "Nairobi", "status": "active", "address": "123 Test St", "owner_id": null, "tax_rate": 7.50, "zip_code": null, "created_at": "2025-08-28T12:11:29.939642", "manager_id": null, "mpesa_type": null, "updated_at": "2025-08-28T12:13:52.309", "water_rate": null, "description": null, "total_units": 6, "purchase_date": null, "purchase_price": null, "electricity_rate": null, "mpesa_till_number": null, "rent_penalty_type": null, "mpesa_store_number": null, "management_fee_type": null, "rent_penalty_amount": null, "mpesa_account_number": null, "mpesa_paybill_number": null, "management_fee_amount": null}	\N	\N	\N	\N	2025-08-28 12:13:52.329788+00	\N
6	units	UPDATE	{"id": "fe13b58b-d2f4-4571-94d7-f2b2cb4bdb40", "status": "vacant", "bedrooms": 2, "tax_rate": null, "bathrooms": 1.0, "unit_size": null, "created_at": "2025-08-28T12:12:50.045784", "updated_at": "2025-08-28T12:12:50.045784", "description": null, "property_id": "3a958191-0d1a-4830-b328-a98890eb2d31", "square_feet": null, "unit_number": "101", "monthly_rent": 25000.00, "security_deposit": null}	{"id": "fe13b58b-d2f4-4571-94d7-f2b2cb4bdb40", "status": "vacant", "bedrooms": 2, "tax_rate": null, "bathrooms": 1.0, "unit_size": null, "created_at": "2025-08-28T12:12:50.045784", "updated_at": "2025-08-28T12:13:54.221", "description": null, "property_id": "3a958191-0d1a-4830-b328-a98890eb2d31", "square_feet": null, "unit_number": "102", "monthly_rent": 26000.00, "security_deposit": null}	\N	\N	\N	\N	2025-08-28 12:13:54.240014+00	\N
7	maintenance_requests	UPDATE	{"id": "2d45298a-873a-46e3-b466-8cc6c996e111", "title": "Test Plumbing Issue", "status": "open", "unit_id": "fe13b58b-d2f4-4571-94d7-f2b2cb4bdb40", "category": "plumbing", "priority": "normal", "tenant_id": null, "created_at": "2025-08-28T12:12:59.952576", "updated_at": "2025-08-28T12:12:59.952576", "actual_cost": null, "assigned_to": null, "description": "Leaky faucet in bathroom", "completed_at": null, "estimated_cost": null}	{"id": "2d45298a-873a-46e3-b466-8cc6c996e111", "title": "Test Plumbing Issue", "status": "in_progress", "unit_id": "fe13b58b-d2f4-4571-94d7-f2b2cb4bdb40", "category": "plumbing", "priority": "high", "tenant_id": null, "created_at": "2025-08-28T12:12:59.952576", "updated_at": "2025-08-28T12:13:55.067", "actual_cost": null, "assigned_to": null, "description": "Leaky faucet in bathroom", "completed_at": null, "estimated_cost": null}	\N	\N	\N	\N	2025-08-28 12:13:55.086934+00	\N
8	maintenance_requests	DELETE	{"id": "2d45298a-873a-46e3-b466-8cc6c996e111", "title": "Test Plumbing Issue", "status": "in_progress", "unit_id": "fe13b58b-d2f4-4571-94d7-f2b2cb4bdb40", "category": "plumbing", "priority": "high", "tenant_id": null, "created_at": "2025-08-28T12:12:59.952576", "updated_at": "2025-08-28T12:13:55.067", "actual_cost": null, "assigned_to": null, "description": "Leaky faucet in bathroom", "completed_at": null, "estimated_cost": null}	\N	\N	\N	\N	\N	2025-08-28 12:14:02.369163+00	\N
9	units	DELETE	{"id": "fe13b58b-d2f4-4571-94d7-f2b2cb4bdb40", "status": "vacant", "bedrooms": 2, "tax_rate": null, "bathrooms": 1.0, "unit_size": null, "created_at": "2025-08-28T12:12:50.045784", "updated_at": "2025-08-28T12:13:54.221", "description": null, "property_id": "3a958191-0d1a-4830-b328-a98890eb2d31", "square_feet": null, "unit_number": "102", "monthly_rent": 26000.00, "security_deposit": null}	\N	\N	\N	\N	\N	2025-08-28 12:14:03.502325+00	\N
10	properties	DELETE	{"id": "3a958191-0d1a-4830-b328-a98890eb2d31", "city": "Nairobi", "name": "Updated Test Property", "type": "apartment_complex", "state": "Nairobi", "status": "active", "address": "123 Test St", "owner_id": null, "tax_rate": 7.50, "zip_code": null, "created_at": "2025-08-28T12:11:29.939642", "manager_id": null, "mpesa_type": null, "updated_at": "2025-08-28T12:13:52.309", "water_rate": null, "description": null, "total_units": 6, "purchase_date": null, "purchase_price": null, "electricity_rate": null, "mpesa_till_number": null, "rent_penalty_type": null, "mpesa_store_number": null, "management_fee_type": null, "rent_penalty_amount": null, "mpesa_account_number": null, "mpesa_paybill_number": null, "management_fee_amount": null}	\N	\N	\N	\N	\N	2025-08-28 12:14:05.521783+00	\N
11	properties	INSERT	\N	{"id": "1b04e021-6f5c-40dc-aa52-f5d4a9e4da71", "city": "Sunrise", "name": "Sunrise", "type": "apartment_complex", "state": "Nairobi", "status": "active", "address": "65789", "owner_id": null, "tax_rate": 7.50, "zip_code": null, "created_at": "2025-08-28T12:17:36.016122", "manager_id": null, "mpesa_type": "paybill", "updated_at": "2025-08-28T12:17:36.016122", "water_rate": 149.86, "description": null, "total_units": 18, "purchase_date": null, "purchase_price": null, "electricity_rate": 0.00, "mpesa_till_number": null, "rent_penalty_type": null, "mpesa_store_number": null, "management_fee_type": null, "rent_penalty_amount": 0.00, "mpesa_account_number": "4567890", "mpesa_paybill_number": "3456", "management_fee_amount": 0.00}	\N	\N	\N	\N	2025-08-28 12:17:36.016122+00	\N
12	units	INSERT	\N	{"id": "3272fc9a-62a2-44bf-82c8-b0e858afcfc8", "status": "vacant", "bedrooms": 1, "tax_rate": null, "bathrooms": 1.0, "unit_size": null, "created_at": "2025-08-28T12:19:15.817055", "updated_at": "2025-08-28T12:19:15.817055", "description": null, "property_id": "1b04e021-6f5c-40dc-aa52-f5d4a9e4da71", "square_feet": null, "unit_number": "20A", "monthly_rent": 20000.00, "security_deposit": 20000.00}	\N	\N	\N	\N	2025-08-28 12:19:15.817055+00	\N
13	users	INSERT	\N	{"id": "d593f8db-085b-4830-9f4a-498c3b5ede78", "role": "tenant", "email": "hiyuo@hmcoo.com", "phone": null, "kra_pin": null, "username": null, "is_active": true, "last_name": "John", "replit_id": null, "created_at": "2025-08-28T12:33:15.791029", "first_name": "Pope", "updated_at": "2025-08-28T12:33:15.791029", "approved_at": null, "approved_by": null, "is_approved": false, "national_id": null, "password_hash": null, "alternate_phone": null, "emergency_contact_name": null, "emergency_contact_phone": null}	\N	\N	\N	\N	2025-08-28 12:33:15.791029+00	\N
14	users	INSERT	\N	{"id": "a41b5c13-68df-4a63-9e4f-b8bfbc4902e5", "role": "tenant", "email": "test.unique@example.com", "phone": null, "kra_pin": null, "username": null, "is_active": true, "last_name": "User", "replit_id": null, "created_at": "2025-08-28T12:35:09.76663", "first_name": "Test", "updated_at": "2025-08-28T12:35:09.76663", "approved_at": null, "approved_by": null, "is_approved": false, "national_id": null, "password_hash": null, "alternate_phone": null, "emergency_contact_name": null, "emergency_contact_phone": null}	\N	\N	\N	\N	2025-08-28 12:35:09.76663+00	\N
15	users	INSERT	\N	{"id": "18457e5d-60b0-4583-81cf-a21e28156417", "role": "tenant", "email": "john.unique.test@example.com", "phone": null, "kra_pin": null, "username": null, "is_active": true, "last_name": "Doe", "replit_id": null, "created_at": "2025-08-28T12:36:28.069335", "first_name": "John", "updated_at": "2025-08-28T12:36:28.069335", "approved_at": null, "approved_by": null, "is_approved": false, "national_id": null, "password_hash": null, "alternate_phone": null, "emergency_contact_name": null, "emergency_contact_phone": null}	\N	\N	\N	\N	2025-08-28 12:36:28.069335+00	\N
16	users	INSERT	\N	{"id": "a81e6af1-1b4a-4185-945c-85e57e7382a1", "role": "tenant", "email": "jane.unique.test2@example.com", "phone": null, "kra_pin": null, "username": null, "is_active": true, "last_name": "Smith", "replit_id": null, "created_at": "2025-08-28T12:36:41.717083", "first_name": "Jane", "updated_at": "2025-08-28T12:36:41.717083", "approved_at": null, "approved_by": null, "is_approved": false, "national_id": null, "password_hash": null, "alternate_phone": null, "emergency_contact_name": "John Smith", "emergency_contact_phone": "+254722123456"}	\N	\N	\N	\N	2025-08-28 12:36:41.717083+00	\N
17	users	INSERT	\N	{"id": "7b390d41-a8f1-41c8-ab26-4904f101bf4c", "role": "tenant", "email": "testphone@example.com", "phone": null, "kra_pin": null, "username": null, "is_active": true, "last_name": "Phone", "replit_id": null, "created_at": "2025-08-28T12:36:52.474353", "first_name": "Test", "updated_at": "2025-08-28T12:36:52.474353", "approved_at": null, "approved_by": null, "is_approved": false, "national_id": null, "password_hash": null, "alternate_phone": null, "emergency_contact_name": null, "emergency_contact_phone": null}	\N	\N	\N	\N	2025-08-28 12:36:52.474353+00	\N
18	users	INSERT	\N	{"id": "227c48bd-7be1-4583-92fe-9e0066c80671", "role": "tenant", "email": "nkrumah@gmail.com", "phone": "57687", "kra_pin": null, "username": null, "is_active": true, "last_name": "NKRUMAH", "replit_id": null, "created_at": "2025-08-28T14:15:25.776175", "first_name": "PETER", "updated_at": "2025-08-28T14:15:25.776175", "approved_at": null, "approved_by": null, "is_approved": false, "national_id": null, "password_hash": null, "alternate_phone": null, "emergency_contact_name": null, "emergency_contact_phone": null}	\N	\N	\N	\N	2025-08-28 14:15:25.776175+00	\N
19	users	INSERT	\N	{"id": "0e434f88-0240-42c1-8546-bbe1f709148d", "role": "tenant", "email": "alice.test.unique@example.com", "phone": "+254711234567", "kra_pin": null, "username": null, "is_active": true, "last_name": "Johnson", "replit_id": null, "created_at": "2025-08-28T14:49:18.720615", "deleted_at": null, "deleted_by": null, "first_name": "Alice", "is_deleted": false, "updated_at": "2025-08-28T14:49:18.720615", "approved_at": null, "approved_by": null, "is_approved": false, "national_id": null, "password_hash": null, "alternate_phone": null, "emergency_contact_name": null, "emergency_contact_phone": null}	\N	\N	\N	\N	2025-08-28 14:49:18.720615+00	\N
20	leases	INSERT	\N	{"id": "6a94df84-620a-480a-8bf2-3d5e51141c66", "terms": null, "status": "active", "unit_id": "f344f75e-6f7e-401a-9a27-b3d3085f9f87", "end_date": null, "tenant_id": "0e434f88-0240-42c1-8546-bbe1f709148d", "created_at": "2025-08-28T14:49:18.818056", "deleted_at": null, "deleted_by": null, "is_deleted": false, "start_date": "2025-03-01T00:00:00", "updated_at": "2025-08-28T14:49:18.818056", "monthly_rent": 25000.00, "move_in_date": "2025-08-28T14:49:18.797", "move_out_date": null, "move_out_reason": null, "security_deposit": 25000.00, "move_out_notice_date": null}	\N	\N	\N	\N	2025-08-28 14:49:18.818056+00	\N
21	units	UPDATE	{"id": "f344f75e-6f7e-401a-9a27-b3d3085f9f87", "status": "vacant", "bedrooms": 1, "tax_rate": null, "bathrooms": 1.0, "unit_size": null, "created_at": "2025-08-27T15:51:13.893333", "deleted_at": null, "deleted_by": null, "is_deleted": false, "updated_at": "2025-08-27T15:51:13.893333", "description": "One bedroom apartment near town center with parking", "property_id": "e6248e10-7d91-4f2c-8202-a3516c554478", "square_feet": 480, "unit_number": "EP1", "monthly_rent": 25000.00, "security_deposit": 25000.00}	{"id": "f344f75e-6f7e-401a-9a27-b3d3085f9f87", "status": "occupied", "bedrooms": 1, "tax_rate": null, "bathrooms": 1.0, "unit_size": null, "created_at": "2025-08-27T15:51:13.893333", "deleted_at": null, "deleted_by": null, "is_deleted": false, "updated_at": "2025-08-27T15:51:13.893333", "description": "One bedroom apartment near town center with parking", "property_id": "e6248e10-7d91-4f2c-8202-a3516c554478", "square_feet": 480, "unit_number": "EP1", "monthly_rent": 25000.00, "security_deposit": 25000.00}	\N	\N	\N	\N	2025-08-28 14:49:18.888337+00	\N
22	units	UPDATE	{"id": "f344f75e-6f7e-401a-9a27-b3d3085f9f87", "status": "occupied", "bedrooms": 1, "tax_rate": null, "bathrooms": 1.0, "unit_size": null, "created_at": "2025-08-27T15:51:13.893333", "deleted_at": null, "deleted_by": null, "is_deleted": false, "updated_at": "2025-08-27T15:51:13.893333", "description": "One bedroom apartment near town center with parking", "property_id": "e6248e10-7d91-4f2c-8202-a3516c554478", "square_feet": 480, "unit_number": "EP1", "monthly_rent": 25000.00, "security_deposit": 25000.00}	{"id": "f344f75e-6f7e-401a-9a27-b3d3085f9f87", "status": "occupied", "bedrooms": 1, "tax_rate": null, "bathrooms": 1.0, "unit_size": null, "created_at": "2025-08-27T15:51:13.893333", "deleted_at": null, "deleted_by": null, "is_deleted": false, "updated_at": "2025-08-28T14:49:18.916", "description": "One bedroom apartment near town center with parking", "property_id": "e6248e10-7d91-4f2c-8202-a3516c554478", "square_feet": 480, "unit_number": "EP1", "monthly_rent": 25000.00, "security_deposit": 25000.00}	\N	\N	\N	\N	2025-08-28 14:49:18.935239+00	\N
23	properties	INSERT	\N	{"id": "f228b0b2-57fa-48de-989d-98d2a9bd91a0", "city": "Nairobi", "name": "Sunrise Apartments", "type": "apartment_complex", "state": "Nairobi County", "status": "active", "address": "123 Kenyatta Avenue, Nairobi", "owner_id": null, "tax_rate": 7.50, "zip_code": null, "created_at": "2025-08-28T15:00:06.439966", "deleted_at": null, "deleted_by": null, "is_deleted": false, "manager_id": null, "mpesa_type": null, "updated_at": "2025-08-28T15:00:06.439966", "water_rate": null, "description": "Modern apartment complex in the city center", "total_units": 0, "purchase_date": null, "purchase_price": null, "electricity_rate": null, "mpesa_till_number": null, "rent_penalty_type": null, "mpesa_store_number": null, "management_fee_type": null, "rent_penalty_amount": null, "mpesa_account_number": null, "mpesa_paybill_number": null, "management_fee_amount": null}	\N	\N	\N	\N	2025-08-28 15:00:06.439966+00	\N
24	properties	INSERT	\N	{"id": "f40d3576-94da-47bb-9b8b-fbc59d793b35", "city": "Nairobi", "name": "Garden View Estate", "type": "townhouse", "state": "Nairobi County", "status": "active", "address": "456 Uhuru Highway, Nairobi", "owner_id": null, "tax_rate": 7.50, "zip_code": null, "created_at": "2025-08-28T15:00:07.747672", "deleted_at": null, "deleted_by": null, "is_deleted": false, "manager_id": null, "mpesa_type": null, "updated_at": "2025-08-28T15:00:07.747672", "water_rate": null, "description": "Quiet residential area with garden views", "total_units": 0, "purchase_date": null, "purchase_price": null, "electricity_rate": null, "mpesa_till_number": null, "rent_penalty_type": null, "mpesa_store_number": null, "management_fee_type": null, "rent_penalty_amount": null, "mpesa_account_number": null, "mpesa_paybill_number": null, "management_fee_amount": null}	\N	\N	\N	\N	2025-08-28 15:00:07.747672+00	\N
25	properties	INSERT	\N	{"id": "861621ec-f769-4be8-98d9-92a006a1ce99", "city": "Nairobi", "name": "Downtown Commercial Plaza", "type": "commercial", "state": "Nairobi County", "status": "active", "address": "789 Moi Avenue, Nairobi", "owner_id": null, "tax_rate": 7.50, "zip_code": null, "created_at": "2025-08-28T15:00:08.913676", "deleted_at": null, "deleted_by": null, "is_deleted": false, "manager_id": null, "mpesa_type": null, "updated_at": "2025-08-28T15:00:08.913676", "water_rate": null, "description": "Prime commercial space in downtown Nairobi", "total_units": 0, "purchase_date": null, "purchase_price": null, "electricity_rate": null, "mpesa_till_number": null, "rent_penalty_type": null, "mpesa_store_number": null, "management_fee_type": null, "rent_penalty_amount": null, "mpesa_account_number": null, "mpesa_paybill_number": null, "management_fee_amount": null}	\N	\N	\N	\N	2025-08-28 15:00:08.913676+00	\N
26	units	INSERT	\N	{"id": "9cb3146d-8193-4995-834f-2ebd31bbbc5a", "status": "vacant", "bedrooms": 2, "tax_rate": null, "bathrooms": 2.0, "unit_size": null, "created_at": "2025-08-28T15:00:25.777827", "deleted_at": null, "deleted_by": null, "is_deleted": false, "updated_at": "2025-08-28T15:00:25.777827", "description": null, "property_id": "f228b0b2-57fa-48de-989d-98d2a9bd91a0", "square_feet": 800, "unit_number": "A101", "monthly_rent": 45000.00, "security_deposit": 90000.00}	\N	\N	\N	\N	2025-08-28 15:00:25.777827+00	\N
27	units	INSERT	\N	{"id": "e64868aa-0c0c-47a8-9585-050fea8ec3b2", "status": "vacant", "bedrooms": 3, "tax_rate": null, "bathrooms": 2.0, "unit_size": null, "created_at": "2025-08-28T15:00:27.460533", "deleted_at": null, "deleted_by": null, "is_deleted": false, "updated_at": "2025-08-28T15:00:27.460533", "description": null, "property_id": "f228b0b2-57fa-48de-989d-98d2a9bd91a0", "square_feet": 1000, "unit_number": "A102", "monthly_rent": 50000.00, "security_deposit": 100000.00}	\N	\N	\N	\N	2025-08-28 15:00:27.460533+00	\N
28	units	INSERT	\N	{"id": "329c2ca1-6453-45e6-8876-5933e19783cc", "status": "vacant", "bedrooms": 4, "tax_rate": null, "bathrooms": 3.0, "unit_size": null, "created_at": "2025-08-28T15:00:29.434859", "deleted_at": null, "deleted_by": null, "is_deleted": false, "updated_at": "2025-08-28T15:00:29.434859", "description": null, "property_id": "f40d3576-94da-47bb-9b8b-fbc59d793b35", "square_feet": 1500, "unit_number": "TH01", "monthly_rent": 75000.00, "security_deposit": 150000.00}	\N	\N	\N	\N	2025-08-28 15:00:29.434859+00	\N
29	units	INSERT	\N	{"id": "28b5daac-7beb-491b-abe7-52f9d5c0f9c4", "status": "vacant", "bedrooms": 0, "tax_rate": null, "bathrooms": 1.0, "unit_size": null, "created_at": "2025-08-28T15:00:31.391898", "deleted_at": null, "deleted_by": null, "is_deleted": false, "updated_at": "2025-08-28T15:00:31.391898", "description": null, "property_id": "861621ec-f769-4be8-98d9-92a006a1ce99", "square_feet": 600, "unit_number": "Shop-G1", "monthly_rent": 120000.00, "security_deposit": 240000.00}	\N	\N	\N	\N	2025-08-28 15:00:31.391898+00	\N
30	leases	INSERT	\N	{"id": "e4dd1491-3cf6-4489-8669-c3395702eb58", "terms": null, "status": "active", "unit_id": "27d38268-1b36-4e79-9520-b3b4a4a5730b", "end_date": "2025-12-31T00:00:00", "tenant_id": "524633e8-667b-4a00-9346-25c7fe8e3e54", "created_at": "2025-08-28T15:02:43.69446", "deleted_at": null, "deleted_by": null, "is_deleted": false, "start_date": "2025-01-01T00:00:00", "updated_at": "2025-08-28T15:02:43.69446", "monthly_rent": 65000.00, "move_in_date": null, "move_out_date": null, "move_out_reason": null, "security_deposit": 130000.00, "move_out_notice_date": null}	\N	\N	\N	\N	2025-08-28 15:02:43.69446+00	\N
31	leases	INSERT	\N	{"id": "85e2aabe-1f93-4470-a607-1462ee7fd627", "terms": null, "status": "active", "unit_id": "957fb6d3-d620-4d2e-bf86-5e20bf169990", "end_date": "2025-12-31T00:00:00", "tenant_id": "9975884a-6ff5-4bdd-b05d-822b00dac43d", "created_at": "2025-08-28T15:02:43.69446", "deleted_at": null, "deleted_by": null, "is_deleted": false, "start_date": "2025-01-01T00:00:00", "updated_at": "2025-08-28T15:02:43.69446", "monthly_rent": 85000.00, "move_in_date": null, "move_out_date": null, "move_out_reason": null, "security_deposit": 170000.00, "move_out_notice_date": null}	\N	\N	\N	\N	2025-08-28 15:02:43.69446+00	\N
32	leases	INSERT	\N	{"id": "25029d9a-2fac-4ba3-b8c1-eb674be1027e", "terms": null, "status": "active", "unit_id": "6b63d494-d6b3-4c60-ba59-8d8dd43a0205", "end_date": "2025-12-31T00:00:00", "tenant_id": "8c6c5d2a-c1c8-4cd6-a973-2e6b2f2e6246", "created_at": "2025-08-28T15:02:43.69446", "deleted_at": null, "deleted_by": null, "is_deleted": false, "start_date": "2025-01-01T00:00:00", "updated_at": "2025-08-28T15:02:43.69446", "monthly_rent": 120000.00, "move_in_date": null, "move_out_date": null, "move_out_reason": null, "security_deposit": 240000.00, "move_out_notice_date": null}	\N	\N	\N	\N	2025-08-28 15:02:43.69446+00	\N
33	payments	INSERT	\N	{"id": "d69a3e30-989c-4efb-86c4-7b49e8717bf7", "notes": null, "amount": 65000.00, "status": "paid", "unit_id": "27d38268-1b36-4e79-9520-b3b4a4a5730b", "due_date": "2025-01-15T00:00:00", "lease_id": null, "tenant_id": "524633e8-667b-4a00-9346-25c7fe8e3e54", "created_at": "2025-08-28T15:03:29.837184", "updated_at": "2025-08-28T15:03:29.837184", "description": "January 2025 rent payment", "payment_date": "2025-01-15T00:00:00", "payment_method": "mpesa", "transaction_id": null, "mpesa_phone_number": null, "mpesa_receipt_number": null, "mpesa_transaction_id": null, "mpesa_checkout_request_id": null}	\N	\N	\N	\N	2025-08-28 15:03:29.837184+00	\N
34	payments	INSERT	\N	{"id": "977bc3da-27ec-4dc6-a0b5-73cdddeca730", "notes": null, "amount": 85000.00, "status": "paid", "unit_id": "957fb6d3-d620-4d2e-bf86-5e20bf169990", "due_date": "2025-01-15T00:00:00", "lease_id": null, "tenant_id": "9975884a-6ff5-4bdd-b05d-822b00dac43d", "created_at": "2025-08-28T15:03:29.837184", "updated_at": "2025-08-28T15:03:29.837184", "description": "January 2025 rent payment", "payment_date": "2025-01-10T00:00:00", "payment_method": "mpesa", "transaction_id": null, "mpesa_phone_number": null, "mpesa_receipt_number": null, "mpesa_transaction_id": null, "mpesa_checkout_request_id": null}	\N	\N	\N	\N	2025-08-28 15:03:29.837184+00	\N
35	payments	INSERT	\N	{"id": "fcd4924f-42e4-49b4-b862-6093795c6809", "notes": null, "amount": 60000.00, "status": "paid", "unit_id": "6b63d494-d6b3-4c60-ba59-8d8dd43a0205", "due_date": "2025-01-15T00:00:00", "lease_id": null, "tenant_id": "8c6c5d2a-c1c8-4cd6-a973-2e6b2f2e6246", "created_at": "2025-08-28T15:03:29.837184", "updated_at": "2025-08-28T15:03:29.837184", "description": "January 2025 partial rent payment (60K of 120K)", "payment_date": "2025-01-10T00:00:00", "payment_method": "bank_transfer", "transaction_id": null, "mpesa_phone_number": null, "mpesa_receipt_number": null, "mpesa_transaction_id": null, "mpesa_checkout_request_id": null}	\N	\N	\N	\N	2025-08-28 15:03:29.837184+00	\N
36	payments	INSERT	\N	{"id": "b24296ec-ec6b-4a59-9f0b-7a04701c4a36", "notes": null, "amount": 65000.00, "status": "pending", "unit_id": "27d38268-1b36-4e79-9520-b3b4a4a5730b", "due_date": "2025-02-15T00:00:00", "lease_id": null, "tenant_id": "524633e8-667b-4a00-9346-25c7fe8e3e54", "created_at": "2025-08-28T15:03:29.837184", "updated_at": "2025-08-28T15:03:29.837184", "description": "February 2025 rent payment", "payment_date": "2025-02-15T00:00:00", "payment_method": "mpesa", "transaction_id": null, "mpesa_phone_number": null, "mpesa_receipt_number": null, "mpesa_transaction_id": null, "mpesa_checkout_request_id": null}	\N	\N	\N	\N	2025-08-28 15:03:29.837184+00	\N
37	payments	INSERT	\N	{"id": "7906083d-0784-4009-ba2f-d48701ea7274", "notes": null, "amount": 60000.00, "status": "pending", "unit_id": "6b63d494-d6b3-4c60-ba59-8d8dd43a0205", "due_date": "2025-02-15T00:00:00", "lease_id": null, "tenant_id": "8c6c5d2a-c1c8-4cd6-a973-2e6b2f2e6246", "created_at": "2025-08-28T15:03:29.837184", "updated_at": "2025-08-28T15:03:29.837184", "description": "February 2025 remaining balance (60K of 120K)", "payment_date": "2025-02-15T00:00:00", "payment_method": "mpesa", "transaction_id": null, "mpesa_phone_number": null, "mpesa_receipt_number": null, "mpesa_transaction_id": null, "mpesa_checkout_request_id": null}	\N	\N	\N	\N	2025-08-28 15:03:29.837184+00	\N
38	payments	INSERT	\N	{"id": "43d8570f-056a-4fbc-80b1-84ab2db6e61b", "notes": null, "amount": 85000.00, "status": "overdue", "unit_id": "957fb6d3-d620-4d2e-bf86-5e20bf169990", "due_date": "2024-12-15T00:00:00", "lease_id": null, "tenant_id": "9975884a-6ff5-4bdd-b05d-822b00dac43d", "created_at": "2025-08-28T15:03:29.837184", "updated_at": "2025-08-28T15:03:29.837184", "description": "December 2024 rent payment", "payment_date": "2024-12-15T00:00:00", "payment_method": "mpesa", "transaction_id": null, "mpesa_phone_number": null, "mpesa_receipt_number": null, "mpesa_transaction_id": null, "mpesa_checkout_request_id": null}	\N	\N	\N	\N	2025-08-28 15:03:29.837184+00	\N
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoices (id, tenant_id, unit_id, invoice_number, amount, due_date, status, description, items_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: leases; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.leases (id, unit_id, tenant_id, start_date, end_date, monthly_rent, security_deposit, status, terms, created_at, updated_at, move_in_date, move_out_date, move_out_notice_date, move_out_reason, is_deleted, deleted_at, deleted_by) FROM stdin;
9bc2ebd4-7365-47c9-a6f4-57b64e5fb7ac	7c301abc-d2ee-4d0f-8242-46432cbdfb0f	e892fbb8-a5df-4609-88c9-c11a053c0545	2024-01-01 00:00:00	2024-12-31 00:00:00	200000.00	200000.00	active	Standard residential lease with garden access. No pets allowed. 1 year minimum term.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
879c6f7b-0f80-42e0-9f42-065f8c84e40e	9ab061d3-ca03-4ff7-acbd-52fca0ad695c	e8684c18-858f-4271-a1c6-9d622b77c471	2024-02-01 00:00:00	2025-01-31 00:00:00	150000.00	150000.00	active	Family townhouse lease. Tenant responsible for garden maintenance. Utilities included.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
51e629e6-2db9-4cb1-bca1-66c62b0fc694	b8850ae3-5e1d-4f3c-aeeb-ad65eb1ec44b	fe12078e-6109-43c0-9f17-c368a74c8b84	2024-03-01 00:00:00	2025-02-28 00:00:00	200000.00	200000.00	active	Executive townhouse with garage. Tenant covers water and electricity. 2 year option.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
5aadbaee-0f8e-408f-ba1c-5cc756b9fef7	6b63d494-d6b3-4c60-ba59-8d8dd43a0205	952deed1-8b27-46f9-bd1c-bf714005dcee	2024-01-15 00:00:00	2025-01-14 00:00:00	120000.00	120000.00	active	Two bedroom with balcony. Swimming pool and gym access included. No smoking policy.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
40b95490-f848-471f-907c-cdc32a82fc39	27d38268-1b36-4e79-9520-b3b4a4a5730b	6e7e3832-a88b-40e9-8a10-639edcd5c0f5	2024-04-01 00:00:00	2025-03-31 00:00:00	65000.00	65000.00	active	Studio apartment with modern amenities. Perfect for working professional. Internet included.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
0993e6e0-2233-467c-b1bb-73b8fefd783d	957fb6d3-d620-4d2e-bf86-5e20bf169990	f1fde305-ced4-401c-bc39-fce79e072647	2024-02-15 00:00:00	2025-02-14 00:00:00	85000.00	85000.00	active	One bedroom with city views. Backup generator and water supply. 24/7 security.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
f4339032-c27a-4942-91f2-cb2a93fd6b86	93458582-b532-4c44-bf89-ccc7a75a52f4	1e9b62ef-af49-49fd-8acd-de1ca6c2db90	2024-01-01 00:00:00	2024-12-31 00:00:00	50000.00	50000.00	active	Three bedroom family unit. Near schools and shopping. Covered parking included.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
fec4646e-1a2b-4ce6-9032-6e4ed5c16c6f	01debb6b-9e5a-4b6c-a1b5-c9593d959bfd	67facb85-77b9-415d-a1a9-57903c253fc1	2024-03-15 00:00:00	2025-03-14 00:00:00	50000.00	50000.00	active	Central location apartment. Walking distance to town center. Backup power available.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
8c18675b-ef3b-40bb-b4ab-d8f794f3d71e	812a1099-b5b4-4b71-9ed7-bf2c3863e6fc	35c04af0-929d-4f6a-8f26-86b27c9bdc89	2024-05-01 00:00:00	2025-04-30 00:00:00	50000.00	50000.00	active	Modern apartment with appliances. Suitable for small family. Parking space included.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
9d98a812-309c-4ba8-ba10-7625c6c541fe	0cca6cf6-04d1-433a-8d98-2f7ba8fa4354	1384fd1f-75a5-409c-83ef-2106fe0878fc	2024-06-01 00:00:00	2025-05-31 00:00:00	50000.00	50000.00	active	Three bedroom near market area. Good for business persons. Security deposit negotiable.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
dd33d555-00ca-4a2c-944f-4eeaf5049225	1164afdb-9863-4e9c-9cf8-6beecb928024	0364ee40-4e41-4719-bce5-d5784162ccf6	2024-04-01 00:00:00	2025-03-31 00:00:00	65000.00	65000.00	active	Lake view apartment with modern kitchen. Peaceful environment. Boat parking available.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
f421c006-f4c8-426d-ba42-f6ad886a5c2d	8a4d6182-c665-4a0b-8261-fbdc70581128	71cc0994-d62e-46bc-ac1c-8008a794cad3	2024-07-01 00:00:00	2025-06-30 00:00:00	150000.00	150000.00	active	Luxury townhouse with private garden. Club house access. Swimming pool privileges.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
7e46d505-ad65-4a1d-85d1-3210676280c2	fdc941da-3766-4fde-8f1c-24ef0a13d1aa	4f10e94b-023e-4757-b523-15740c534cea	2024-08-01 00:00:00	2025-07-31 00:00:00	200000.00	200000.00	active	Four bedroom executive townhouse. Double garage and staff quarters. Premium location.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
48bbb488-c8ad-4f83-8ffc-97aadbc38b9c	861707ae-cc94-4dc4-b3f2-cf1add9cae1a	a332d5a7-b2f9-4696-9df1-67d59a6f76f1	2024-09-01 00:00:00	2025-08-31 00:00:00	65000.00	65000.00	active	Studio with kitchenette. Ideal for young professional. Gym membership included.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
813b32cc-6c5d-47c0-8f7b-80de7cb1950b	6a404640-e5cd-43af-85f2-32642e82b043	33c6dbd3-3517-4cd3-97d1-bf2d7357d8b7	2024-10-01 00:00:00	2025-09-30 00:00:00	65000.00	65000.00	active	Affordable studio in prime location. Modern fixtures. Lift access to all floors.	2025-08-27 15:54:04.636259	2025-08-27 15:54:04.636259	\N	\N	\N	\N	f	\N	\N
6a94df84-620a-480a-8bf2-3d5e51141c66	f344f75e-6f7e-401a-9a27-b3d3085f9f87	0e434f88-0240-42c1-8546-bbe1f709148d	2025-03-01 00:00:00	\N	25000.00	25000.00	active	\N	2025-08-28 14:49:18.818056	2025-08-28 14:49:18.818056	2025-08-28 14:49:18.797	\N	\N	\N	f	\N	\N
e4dd1491-3cf6-4489-8669-c3395702eb58	27d38268-1b36-4e79-9520-b3b4a4a5730b	524633e8-667b-4a00-9346-25c7fe8e3e54	2025-01-01 00:00:00	2025-12-31 00:00:00	65000.00	130000.00	active	\N	2025-08-28 15:02:43.69446	2025-08-28 15:02:43.69446	\N	\N	\N	\N	f	\N	\N
85e2aabe-1f93-4470-a607-1462ee7fd627	957fb6d3-d620-4d2e-bf86-5e20bf169990	9975884a-6ff5-4bdd-b05d-822b00dac43d	2025-01-01 00:00:00	2025-12-31 00:00:00	85000.00	170000.00	active	\N	2025-08-28 15:02:43.69446	2025-08-28 15:02:43.69446	\N	\N	\N	\N	f	\N	\N
25029d9a-2fac-4ba3-b8c1-eb674be1027e	6b63d494-d6b3-4c60-ba59-8d8dd43a0205	8c6c5d2a-c1c8-4cd6-a973-2e6b2f2e6246	2025-01-01 00:00:00	2025-12-31 00:00:00	120000.00	240000.00	active	\N	2025-08-28 15:02:43.69446	2025-08-28 15:02:43.69446	\N	\N	\N	\N	f	\N	\N
\.


--
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.maintenance_requests (id, unit_id, tenant_id, title, description, category, priority, status, assigned_to, estimated_cost, actual_cost, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payments (id, tenant_id, lease_id, unit_id, amount, payment_date, due_date, payment_method, status, description, transaction_id, notes, created_at, updated_at, mpesa_phone_number, mpesa_checkout_request_id, mpesa_transaction_id, mpesa_receipt_number) FROM stdin;
d69a3e30-989c-4efb-86c4-7b49e8717bf7	524633e8-667b-4a00-9346-25c7fe8e3e54	\N	27d38268-1b36-4e79-9520-b3b4a4a5730b	65000.00	2025-01-15 00:00:00	2025-01-15 00:00:00	mpesa	paid	January 2025 rent payment	\N	\N	2025-08-28 15:03:29.837184	2025-08-28 15:03:29.837184	\N	\N	\N	\N
977bc3da-27ec-4dc6-a0b5-73cdddeca730	9975884a-6ff5-4bdd-b05d-822b00dac43d	\N	957fb6d3-d620-4d2e-bf86-5e20bf169990	85000.00	2025-01-10 00:00:00	2025-01-15 00:00:00	mpesa	paid	January 2025 rent payment	\N	\N	2025-08-28 15:03:29.837184	2025-08-28 15:03:29.837184	\N	\N	\N	\N
fcd4924f-42e4-49b4-b862-6093795c6809	8c6c5d2a-c1c8-4cd6-a973-2e6b2f2e6246	\N	6b63d494-d6b3-4c60-ba59-8d8dd43a0205	60000.00	2025-01-10 00:00:00	2025-01-15 00:00:00	bank_transfer	paid	January 2025 partial rent payment (60K of 120K)	\N	\N	2025-08-28 15:03:29.837184	2025-08-28 15:03:29.837184	\N	\N	\N	\N
b24296ec-ec6b-4a59-9f0b-7a04701c4a36	524633e8-667b-4a00-9346-25c7fe8e3e54	\N	27d38268-1b36-4e79-9520-b3b4a4a5730b	65000.00	2025-02-15 00:00:00	2025-02-15 00:00:00	mpesa	pending	February 2025 rent payment	\N	\N	2025-08-28 15:03:29.837184	2025-08-28 15:03:29.837184	\N	\N	\N	\N
7906083d-0784-4009-ba2f-d48701ea7274	8c6c5d2a-c1c8-4cd6-a973-2e6b2f2e6246	\N	6b63d494-d6b3-4c60-ba59-8d8dd43a0205	60000.00	2025-02-15 00:00:00	2025-02-15 00:00:00	mpesa	pending	February 2025 remaining balance (60K of 120K)	\N	\N	2025-08-28 15:03:29.837184	2025-08-28 15:03:29.837184	\N	\N	\N	\N
43d8570f-056a-4fbc-80b1-84ab2db6e61b	9975884a-6ff5-4bdd-b05d-822b00dac43d	\N	957fb6d3-d620-4d2e-bf86-5e20bf169990	85000.00	2024-12-15 00:00:00	2024-12-15 00:00:00	mpesa	overdue	December 2024 rent payment	\N	\N	2025-08-28 15:03:29.837184	2025-08-28 15:03:29.837184	\N	\N	\N	\N
\.


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.properties (id, name, type, address, city, state, zip_code, description, total_units, status, purchase_price, purchase_date, owner_id, manager_id, created_at, updated_at, water_rate, electricity_rate, mpesa_type, mpesa_paybill_number, mpesa_account_number, mpesa_store_number, mpesa_till_number, rent_penalty_type, rent_penalty_amount, tax_rate, management_fee_type, management_fee_amount, is_deleted, deleted_at, deleted_by) FROM stdin;
632af50a-dec1-4bec-a473-eb10d9795813	Test Property	single_family	123 Test St	Test City	TS	12345	\N	0	active	250000.00	\N	\N	\N	2025-08-27 14:45:59.156466	2025-08-27 14:45:59.156466	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
a81805ea-efb4-423e-9108-751681104c5d	Test Property	apartment_complex	123 Test St	Nairobi	Nairobi	\N	\N	5	active	\N	\N	\N	\N	2025-08-27 15:29:57.695442	2025-08-27 15:29:57.695442	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
8b1d5f3e-eeaf-4610-b852-6d2e30c8fb8c	juiko	apartment_complex	K9678	Ruiru	Kiambu	\N		15	active	\N	\N	\N	\N	2025-08-27 15:32:35.312242	2025-08-27 15:32:35.312242	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
9aaffa4a-9d2e-472d-8506-1fd56be96647	Kileleshwa Heights	apartment_complex	Kileleshwa Road, Off Mandera Road	Nairobi	Nairobi County	\N	Modern apartment complex in upscale Kileleshwa with amenities including gym, swimming pool, and 24/7 security	45	active	\N	\N	\N	\N	2025-08-27 15:49:04.568838	2025-08-27 15:49:04.568838	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	Westlands Towers	apartment_complex	Westlands Road, Near Sarit Centre	Nairobi	Nairobi County	\N	High-rise residential towers in the heart of Westlands business district with shopping mall proximity	60	active	\N	\N	\N	\N	2025-08-27 15:49:04.568838	2025-08-27 15:49:04.568838	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
95fea72f-554b-4031-9d37-0dfd742602ce	Karen Residences	townhouse	Karen Road, Off Ngong Road	Nairobi	Nairobi County	\N	Luxury townhouses in Karen with gardens, clubhouse, and children play area	30	active	\N	\N	\N	\N	2025-08-27 15:49:04.568838	2025-08-27 15:49:04.568838	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
578b1474-3fe1-4e79-b183-c41ef571a2de	Mombasa Marina	apartment_complex	Links Road, Nyali	Mombasa	Mombasa County	\N	Oceanfront apartments with sea views, swimming pool, and beach access	40	active	\N	\N	\N	\N	2025-08-27 15:49:04.568838	2025-08-27 15:49:04.568838	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
0fa869e8-1d07-4c82-bcfc-9e31b77373fd	Nakuru Gardens	apartment_complex	Kenyatta Avenue, Section 58	Nakuru	Nakuru County	\N	Family-friendly apartments with landscaped gardens and playground facilities	35	active	\N	\N	\N	\N	2025-08-27 15:49:04.568838	2025-08-27 15:49:04.568838	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
e6248e10-7d91-4f2c-8202-a3516c554478	Eldoret Plaza	apartment_complex	Uganda Road, Pioneer Estate	Eldoret	Uasin Gishu County	\N	Modern apartments near town center with parking and backup generator	25	active	\N	\N	\N	\N	2025-08-27 15:49:04.568838	2025-08-27 15:49:04.568838	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
582accb6-1b22-4afe-906b-0341a6970007	Kisumu Lakeside	apartment_complex	Oginga Odinga Street, Milimani	Kisumu	Kisumu County	\N	Lake view apartments with modern finishes and ample parking space	28	active	\N	\N	\N	\N	2025-08-27 15:49:04.568838	2025-08-27 15:49:04.568838	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
be90c356-3891-49df-be09-c1010573732c	Thika Green Valley	single_family	Thika-Garissa Road, Section 7	Thika	Kiambu County	\N	Suburban houses with gardens in quiet residential area	22	active	\N	\N	\N	\N	2025-08-27 15:49:04.568838	2025-08-27 15:49:04.568838	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
f9b2e119-da66-40f4-a2d4-ea27a5dbad89	Test Property	apartment_complex	123 Test St	Nairobi	Nairobi	\N	\N	5	active	\N	\N	\N	\N	2025-08-27 19:54:44.814203	2025-08-27 19:54:44.814203	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
dd48807d-8742-439a-adfd-0d5c9229410b	Modern Test	apartment_complex	123 Modern St	Nairobi	Nairobi	\N	\N	3	active	\N	\N	\N	\N	2025-08-27 20:04:37.802334	2025-08-27 20:04:37.802334	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
1b04e021-6f5c-40dc-aa52-f5d4a9e4da71	Sunrise	apartment_complex	65789	Sunrise	Nairobi	\N	\N	18	active	\N	\N	\N	\N	2025-08-28 12:17:36.016122	2025-08-28 12:17:36.016122	149.86	0.00	paybill	3456	4567890	\N	\N	\N	0.00	7.50	\N	0.00	f	\N	\N
f228b0b2-57fa-48de-989d-98d2a9bd91a0	Sunrise Apartments	apartment_complex	123 Kenyatta Avenue, Nairobi	Nairobi	Nairobi County	\N	Modern apartment complex in the city center	0	active	\N	\N	\N	\N	2025-08-28 15:00:06.439966	2025-08-28 15:00:06.439966	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
f40d3576-94da-47bb-9b8b-fbc59d793b35	Garden View Estate	townhouse	456 Uhuru Highway, Nairobi	Nairobi	Nairobi County	\N	Quiet residential area with garden views	0	active	\N	\N	\N	\N	2025-08-28 15:00:07.747672	2025-08-28 15:00:07.747672	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
861621ec-f769-4be8-98d9-92a006a1ce99	Downtown Commercial Plaza	commercial	789 Moi Avenue, Nairobi	Nairobi	Nairobi County	\N	Prime commercial space in downtown Nairobi	0	active	\N	\N	\N	\N	2025-08-28 15:00:08.913676	2025-08-28 15:00:08.913676	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.50	\N	\N	f	\N	\N
\.


--
-- Data for Name: property_recurring_fees; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.property_recurring_fees (id, property_id, fee_type, amount, description, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.schema_migrations (id, name, version, checksum, applied_at, execution_time, rollback_sql) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
KKkz4oKJA6zSIJD9DaCLNYAoEEvW5V6R	{"cookie": {"path": "/", "secure": false, "expires": "2025-09-04T12:06:11.342Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "45896acc-cc79-447d-b79d-dab1e9907932"}	2025-09-04 15:04:09
tWkG9gYiiqCkUY-qPCr2aTDK0lvt5Rej	{"cookie": {"path": "/", "secure": true, "expires": "2025-09-03T14:59:50.912Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "RYzwPF1A4UFryKjxogyZ6lqSweUm2YNmhEbj_sNDYc8"}}	2025-09-03 14:59:51
6Bbv-suGc81tntCDemU1gC_n0MTo1Z15	{"cookie": {"path": "/", "secure": false, "expires": "2025-09-03T17:02:23.679Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": "81fbbaab-2b80-45d0-bf53-ad6be7e7905f"}	2025-09-03 17:02:33
\.


--
-- Data for Name: tenant_deposits; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tenant_deposits (id, tenant_id, lease_id, deposit_type, amount_paid, amount_returned, return_date, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tenant_documents (id, tenant_id, document_type, file_name, file_path, file_size, mime_type, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: tenant_gadgets; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tenant_gadgets (id, tenant_id, lease_id, item_name, description, serial_number, condition, is_returned, return_date, return_condition, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: unit_recurring_fees; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.unit_recurring_fees (id, unit_id, fee_type, amount, description, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.units (id, property_id, unit_number, bedrooms, bathrooms, square_feet, monthly_rent, security_deposit, status, description, created_at, updated_at, unit_size, tax_rate, is_deleted, deleted_at, deleted_by) FROM stdin;
4515aece-7c58-4bd1-bf06-27a172f5bb1b	632af50a-dec1-4bec-a473-eb10d9795813	101	0	0.0	800	1500.00	\N	vacant	\N	2025-08-27 14:46:15.384291	2025-08-27 14:46:15.384291	\N	\N	f	\N	\N
186f7110-2c87-4a4d-965a-da16d8d1aa72	9aaffa4a-9d2e-472d-8506-1fd56be96647	A1	0	1.0	450	65000.00	65000.00	vacant	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
316ab35d-3086-42e7-a0d6-a28c1050f4b4	9aaffa4a-9d2e-472d-8506-1fd56be96647	A2	1	1.0	650	85000.00	85000.00	vacant	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
d5c18e25-26c9-4026-8d42-139ce70ba80a	9aaffa4a-9d2e-472d-8506-1fd56be96647	A3	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
27d38268-1b36-4e79-9520-b3b4a4a5730b	9aaffa4a-9d2e-472d-8506-1fd56be96647	A4	0	1.0	450	65000.00	65000.00	occupied	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
2f6fda03-5b49-40b8-897c-ac80336f2029	9aaffa4a-9d2e-472d-8506-1fd56be96647	A5	1	1.0	650	85000.00	85000.00	vacant	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
6f8cec35-4ec8-4eac-82d2-0af0d3d879f2	9aaffa4a-9d2e-472d-8506-1fd56be96647	A6	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
9539e59c-46af-418a-be01-928737f50be8	9aaffa4a-9d2e-472d-8506-1fd56be96647	A7	0	1.0	450	65000.00	65000.00	vacant	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
957fb6d3-d620-4d2e-bf86-5e20bf169990	9aaffa4a-9d2e-472d-8506-1fd56be96647	A8	1	1.0	650	85000.00	85000.00	occupied	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
4153c5cd-73b8-418c-93b0-8f6ddb4408b7	9aaffa4a-9d2e-472d-8506-1fd56be96647	A9	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
6a19e633-81bd-4f07-9c32-702e3f8da40e	9aaffa4a-9d2e-472d-8506-1fd56be96647	A10	0	1.0	450	65000.00	65000.00	vacant	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
607b6d41-553e-4b14-bb39-5f4ef3e6de2e	9aaffa4a-9d2e-472d-8506-1fd56be96647	A11	1	1.0	650	85000.00	85000.00	vacant	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
6b63d494-d6b3-4c60-ba59-8d8dd43a0205	9aaffa4a-9d2e-472d-8506-1fd56be96647	A12	2	2.0	850	120000.00	120000.00	occupied	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
06e63b26-fff5-48a3-bf3d-8f92e3a41664	9aaffa4a-9d2e-472d-8506-1fd56be96647	A13	0	1.0	450	65000.00	65000.00	vacant	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
c5c5be75-bb19-4ebf-8469-6079cf2cec8d	9aaffa4a-9d2e-472d-8506-1fd56be96647	A14	1	1.0	650	85000.00	85000.00	vacant	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
6745f31a-5758-48c1-bea0-c1f64b2d13d3	9aaffa4a-9d2e-472d-8506-1fd56be96647	A15	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
861707ae-cc94-4dc4-b3f2-cf1add9cae1a	9aaffa4a-9d2e-472d-8506-1fd56be96647	B1	0	1.0	450	65000.00	65000.00	occupied	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
0f4b1f2b-694f-4555-9852-1a6682c2c4c0	9aaffa4a-9d2e-472d-8506-1fd56be96647	B2	1	1.0	650	85000.00	85000.00	vacant	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
69cb77f9-c2e0-49da-9bd0-83689852b5ee	9aaffa4a-9d2e-472d-8506-1fd56be96647	B3	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
34ac8576-3cd9-49d7-8978-3bfef5a4e6b9	9aaffa4a-9d2e-472d-8506-1fd56be96647	B4	0	1.0	450	65000.00	65000.00	vacant	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
29bfce3c-4fde-4610-809d-51bcf6c2f060	9aaffa4a-9d2e-472d-8506-1fd56be96647	B5	1	1.0	650	85000.00	85000.00	occupied	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
bbdb1f92-a36c-4c95-b799-48da6103f59b	9aaffa4a-9d2e-472d-8506-1fd56be96647	B6	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
ef6807b0-89d8-4e6a-ba9f-e84f3ca1615f	9aaffa4a-9d2e-472d-8506-1fd56be96647	B7	0	1.0	450	65000.00	65000.00	vacant	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
0bf15f8d-aaa5-41c1-8068-e335fecc536a	9aaffa4a-9d2e-472d-8506-1fd56be96647	B8	1	1.0	650	85000.00	85000.00	vacant	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
a1bbe055-f94d-440f-bedb-c884950d153b	9aaffa4a-9d2e-472d-8506-1fd56be96647	B9	2	2.0	850	120000.00	120000.00	occupied	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
39ba7fe1-06b1-41af-a26c-a1c97018c2e4	9aaffa4a-9d2e-472d-8506-1fd56be96647	B10	0	1.0	450	65000.00	65000.00	vacant	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
d6837625-8597-4263-8a83-60b1baa16603	9aaffa4a-9d2e-472d-8506-1fd56be96647	B11	1	1.0	650	85000.00	85000.00	vacant	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
fe195299-01be-431d-9825-60617958eda2	9aaffa4a-9d2e-472d-8506-1fd56be96647	B12	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
6a404640-e5cd-43af-85f2-32642e82b043	9aaffa4a-9d2e-472d-8506-1fd56be96647	B13	0	1.0	450	65000.00	65000.00	occupied	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
92213278-fd83-4390-a18d-67eddfe08b1b	9aaffa4a-9d2e-472d-8506-1fd56be96647	B14	1	1.0	650	85000.00	85000.00	vacant	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
fef4bd9e-52bf-4896-b918-6d4eb4b69477	9aaffa4a-9d2e-472d-8506-1fd56be96647	B15	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
6e339d89-f94d-4ab9-98f5-facd33b7fba1	9aaffa4a-9d2e-472d-8506-1fd56be96647	C1	0	1.0	450	65000.00	65000.00	vacant	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
449be32e-5a58-48f8-bbef-ae34cd151e77	9aaffa4a-9d2e-472d-8506-1fd56be96647	C2	1	1.0	650	85000.00	85000.00	occupied	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
33e902d8-bb34-4e42-a202-2c0d73a7d539	9aaffa4a-9d2e-472d-8506-1fd56be96647	C3	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
7b0d4965-14da-4f24-95aa-bee87c75903f	9aaffa4a-9d2e-472d-8506-1fd56be96647	C4	0	1.0	450	65000.00	65000.00	vacant	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
cc31a462-e431-4dbc-aeb4-3a882b069f34	9aaffa4a-9d2e-472d-8506-1fd56be96647	C5	1	1.0	650	85000.00	85000.00	vacant	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
57e37c79-03fb-452a-be84-4d4c65e68cea	9aaffa4a-9d2e-472d-8506-1fd56be96647	C6	2	2.0	850	120000.00	120000.00	occupied	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
46a20ae0-39cb-475f-b03e-9f0d86d453ff	9aaffa4a-9d2e-472d-8506-1fd56be96647	C7	0	1.0	450	65000.00	65000.00	vacant	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
ef325361-6161-41cc-947d-3c11f772ede5	9aaffa4a-9d2e-472d-8506-1fd56be96647	C8	1	1.0	650	85000.00	85000.00	vacant	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
d5d6b8da-43d1-47e4-a499-096a5f9ecef3	9aaffa4a-9d2e-472d-8506-1fd56be96647	C9	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
efadb76f-49e1-4c49-a6d6-cee06cde0ad5	9aaffa4a-9d2e-472d-8506-1fd56be96647	C10	0	1.0	450	65000.00	65000.00	occupied	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
c6b6c5b6-d1ee-47ae-9fe0-2c19c53cef02	9aaffa4a-9d2e-472d-8506-1fd56be96647	C11	1	1.0	650	85000.00	85000.00	vacant	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
a8f6511e-e4d9-4354-acaa-9840509227a2	9aaffa4a-9d2e-472d-8506-1fd56be96647	C12	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
24db2a8d-62c3-4065-9b1c-10d4a7d92e49	9aaffa4a-9d2e-472d-8506-1fd56be96647	C13	0	1.0	450	65000.00	65000.00	vacant	Modern studio apartment with kitchenette and city views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
e576b481-08e3-4c0f-a7d8-f9be0423e289	9aaffa4a-9d2e-472d-8506-1fd56be96647	C14	1	1.0	650	85000.00	85000.00	occupied	Spacious one bedroom with balcony and modern finishes	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
2417c3c2-074b-4e2c-bfcb-2f7606a79e0e	9aaffa4a-9d2e-472d-8506-1fd56be96647	C15	2	2.0	850	120000.00	120000.00	vacant	Two bedroom apartment with ensuite and garden views	2025-08-27 15:50:22.082813	2025-08-27 15:50:22.082813	\N	\N	f	\N	\N
6c26b468-61c1-4f26-8751-bd35dcac93b4	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W1	0	1.0	400	70000.00	70000.00	maintenance	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
8b62ef90-b01b-40d5-838e-476d51332042	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W2	1	1.0	600	90000.00	90000.00	vacant	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
a2fb5539-0999-4e02-a687-b3717b9b376c	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W3	2	2.0	800	130000.00	130000.00	vacant	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
f7c89614-b2ea-4315-bae2-10f2d9357f49	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W4	3	3.0	1200	180000.00	180000.00	vacant	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
3dafc04f-3f7a-4771-8871-653bf8ceabe6	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W5	0	1.0	400	70000.00	70000.00	occupied	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
b5b4cc6d-8d99-42d9-950f-71e006240001	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W6	1	1.0	600	90000.00	90000.00	maintenance	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
a71b11cc-5e31-4fd6-805b-65e88ea6973a	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W7	2	2.0	800	130000.00	130000.00	vacant	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
0ba43a18-cf0e-4f38-aa48-fdf1674a7438	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W8	3	3.0	1200	180000.00	180000.00	vacant	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
190301fb-deb7-44e3-abbd-baa8598029bc	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W9	0	1.0	400	70000.00	70000.00	vacant	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
9b307209-b6b9-4ff1-be15-ae53a07b3a72	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W10	1	1.0	600	90000.00	90000.00	occupied	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
386ab35d-8869-450e-a49f-0e3e588e1593	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W11	2	2.0	800	130000.00	130000.00	maintenance	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
07d096f5-a335-4ca4-90f8-426771409106	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W12	3	3.0	1200	180000.00	180000.00	vacant	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
5da07072-ca0b-426e-ba8c-48d9cd66ac35	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W13	0	1.0	400	70000.00	70000.00	vacant	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
1c7c8d8c-79e0-48c7-ae4f-a779f790e7fa	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W14	1	1.0	600	90000.00	90000.00	vacant	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
1c742ef7-22d9-4b24-b3fa-c079d0203b48	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W15	2	2.0	800	130000.00	130000.00	occupied	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
0175321a-35cb-40c4-9109-c8f904e06dd5	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W16	3	3.0	1200	180000.00	180000.00	maintenance	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
1f4f2603-3d2a-4c84-a364-eb0e3e40dc66	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W17	0	1.0	400	70000.00	70000.00	vacant	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
02fe22c7-7bdd-4405-8422-66c2ccc12793	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W18	1	1.0	600	90000.00	90000.00	vacant	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
63dde44c-5f49-482b-b630-58fc6cf5d34a	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W19	2	2.0	800	130000.00	130000.00	vacant	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
74ddc40f-a95f-46c3-93b8-b8b7ccc2471f	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W20	3	3.0	1200	180000.00	180000.00	occupied	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
2542181f-1364-4406-8c56-45e36c39ff39	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W21	0	1.0	400	70000.00	70000.00	maintenance	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
83f30b42-a8ae-43cc-84cb-673259a54569	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W22	1	1.0	600	90000.00	90000.00	vacant	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
26829cb7-3e0b-47bb-9af1-efcc6568aa05	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W23	2	2.0	800	130000.00	130000.00	vacant	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
49f2c9dd-7db4-4179-8da1-3fccfdfbfaa4	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W24	3	3.0	1200	180000.00	180000.00	vacant	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
eac2b331-4690-4164-9202-b152cbc9fb08	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W25	0	1.0	400	70000.00	70000.00	occupied	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
1f584872-c950-4078-95ee-2d7af8da5da8	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W26	1	1.0	600	90000.00	90000.00	maintenance	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
d028739e-416b-412e-b1e0-7396df345591	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W27	2	2.0	800	130000.00	130000.00	vacant	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
0c534709-aed4-4ba2-a185-2bb0fafce80b	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W28	3	3.0	1200	180000.00	180000.00	vacant	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
38dc7a73-68fd-4215-b69c-58f0d6f213e5	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W29	0	1.0	400	70000.00	70000.00	vacant	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
7e559465-6fd2-4c88-b972-a27fadfac2e9	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W30	1	1.0	600	90000.00	90000.00	occupied	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
160b4c82-df55-4ac7-b288-2ce90bbcef9c	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W31	2	2.0	800	130000.00	130000.00	maintenance	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
a9808c84-e245-4112-a00f-6e315475e33a	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W32	3	3.0	1200	180000.00	180000.00	vacant	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
ea6acd19-88eb-43fd-b9f4-2f0dcde65df8	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W33	0	1.0	400	70000.00	70000.00	vacant	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
29971ba8-cf8a-4893-951c-31867f6dfeac	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W34	1	1.0	600	90000.00	90000.00	vacant	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
9766412c-e66a-412c-b213-e4575a021ab3	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W35	2	2.0	800	130000.00	130000.00	occupied	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
ee1204c5-75fc-4a8b-bb33-715d67caf78d	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W36	3	3.0	1200	180000.00	180000.00	maintenance	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
1e72dc82-0911-484d-9f4b-6ea5ae1b623e	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W37	0	1.0	400	70000.00	70000.00	vacant	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
1444401e-c981-433b-aef3-650ec3dde886	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W38	1	1.0	600	90000.00	90000.00	vacant	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
739c7e22-2bdd-46b2-bd6e-3c6590213794	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W39	2	2.0	800	130000.00	130000.00	vacant	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
b32adc01-dff9-4089-95a8-dff6dec3d684	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W40	3	3.0	1200	180000.00	180000.00	occupied	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
1f58e8e6-59dc-451e-ab93-dc6b76dc76c2	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W41	0	1.0	400	70000.00	70000.00	maintenance	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
fff0ebb4-c82c-425c-9988-a15cb7c8c037	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W42	1	1.0	600	90000.00	90000.00	vacant	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
f289c26b-05a2-46ce-ae66-b8bcc7482cef	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W43	2	2.0	800	130000.00	130000.00	vacant	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
28f35f18-0c87-41c0-b9bd-d30e88f951d3	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W44	3	3.0	1200	180000.00	180000.00	vacant	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
050222ea-084c-4f44-9da6-4cc2b3c6c451	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W45	0	1.0	400	70000.00	70000.00	occupied	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
5f2567ec-9814-4beb-bfbe-c2af793eecb3	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W46	1	1.0	600	90000.00	90000.00	maintenance	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
bcf6fd38-143e-4c25-b108-0eaf297091b8	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W47	2	2.0	800	130000.00	130000.00	vacant	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
e533b36a-73a4-443d-b378-b41f1c23772f	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W48	3	3.0	1200	180000.00	180000.00	vacant	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
b619934e-a044-4b7f-837a-8358e0547c74	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W49	0	1.0	400	70000.00	70000.00	vacant	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
d67c2097-8fec-4c19-8318-b57532b0d722	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W50	1	1.0	600	90000.00	90000.00	occupied	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
7cfb5b8e-99d2-4623-88a8-71acc25ee3ef	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W51	2	2.0	800	130000.00	130000.00	maintenance	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
e1d4d750-674a-4c00-9731-a31521557d4a	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W52	3	3.0	1200	180000.00	180000.00	vacant	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
bc90abfa-10c6-4125-bf21-f01346540a62	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W53	0	1.0	400	70000.00	70000.00	vacant	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
96bf749f-8ceb-4e1a-ac7e-b7dd785776f9	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W54	1	1.0	600	90000.00	90000.00	vacant	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
189907fa-8b3d-421b-847d-ba4eebc8a8f5	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W55	2	2.0	800	130000.00	130000.00	occupied	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
24e04f55-24c4-492c-b73f-707f944e28bc	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W56	3	3.0	1200	180000.00	180000.00	maintenance	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
34d883a0-5b8a-4ef3-9f08-8a08857bdcab	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W57	0	1.0	400	70000.00	70000.00	vacant	Studio with business district views and modern appliances	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
ab9aaf35-35e6-44dd-870f-b1a241a8c0a5	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W58	1	1.0	600	90000.00	90000.00	vacant	One bedroom executive apartment with city skyline views	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
f0c65fde-0745-4342-8e77-b7063d9b1411	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W59	2	2.0	800	130000.00	130000.00	vacant	Two bedroom with balcony overlooking shopping centers	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
1dff803e-b7aa-473b-90ab-d6cda8400df6	e7947cb0-d8a3-49b1-8d5d-91d4fdf1fa49	W60	3	3.0	1200	180000.00	180000.00	occupied	Three bedroom penthouse style with rooftop access	2025-08-27 15:50:38.283424	2025-08-27 15:50:38.283424	\N	\N	f	\N	\N
8715ff04-1d0c-4bad-b4b0-011ffa2cb3bb	95fea72f-554b-4031-9d37-0dfd742602ce	KR1	3	2.0	1400	150000.00	150000.00	vacant	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
084f8183-f42a-4767-93ba-8ad3b6f96bbc	95fea72f-554b-4031-9d37-0dfd742602ce	KR2	4	3.0	1800	200000.00	200000.00	vacant	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
2774e109-39f7-4d22-9c59-08c8a482388f	95fea72f-554b-4031-9d37-0dfd742602ce	KR3	3	2.0	1400	150000.00	150000.00	occupied	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
27514373-85b7-4d6e-8f51-507e8a8ee56b	95fea72f-554b-4031-9d37-0dfd742602ce	KR4	4	3.0	1800	200000.00	200000.00	vacant	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
d137da9e-fdc2-41dc-a432-670e274f9191	95fea72f-554b-4031-9d37-0dfd742602ce	KR5	3	2.0	1400	150000.00	150000.00	vacant	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
92b7bdc4-4a5f-4904-b2f7-cf8364938c67	95fea72f-554b-4031-9d37-0dfd742602ce	KR6	4	3.0	1800	200000.00	200000.00	occupied	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
c3a79933-6a2f-41f0-bae3-ef548d60b9a1	95fea72f-554b-4031-9d37-0dfd742602ce	KR7	3	2.0	1400	150000.00	150000.00	vacant	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
33eb684f-8c93-4359-a097-97b75f0ec915	95fea72f-554b-4031-9d37-0dfd742602ce	KR8	4	3.0	1800	200000.00	200000.00	vacant	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
ff52656f-9955-4fa6-8288-2b1ee0afe630	95fea72f-554b-4031-9d37-0dfd742602ce	KR9	3	2.0	1400	150000.00	150000.00	occupied	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
42f0f962-a4ee-48e1-98cf-1efb3dcaa389	95fea72f-554b-4031-9d37-0dfd742602ce	KR10	4	3.0	1800	200000.00	200000.00	vacant	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
250ca2ed-d6ac-4905-9f7c-58d96b099b05	95fea72f-554b-4031-9d37-0dfd742602ce	KR11	3	2.0	1400	150000.00	150000.00	vacant	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
7c301abc-d2ee-4d0f-8242-46432cbdfb0f	95fea72f-554b-4031-9d37-0dfd742602ce	KR12	4	3.0	1800	200000.00	200000.00	occupied	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
1cb592ba-45ef-4e91-bdc1-39156e668428	95fea72f-554b-4031-9d37-0dfd742602ce	KR13	3	2.0	1400	150000.00	150000.00	vacant	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
b055668d-7c7b-45b3-a3d7-b07511f15014	95fea72f-554b-4031-9d37-0dfd742602ce	KR14	4	3.0	1800	200000.00	200000.00	vacant	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
9ab061d3-ca03-4ff7-acbd-52fca0ad695c	95fea72f-554b-4031-9d37-0dfd742602ce	KR15	3	2.0	1400	150000.00	150000.00	occupied	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
f20a3160-a220-4ac4-b47c-c37b1dba093a	95fea72f-554b-4031-9d37-0dfd742602ce	KR16	4	3.0	1800	200000.00	200000.00	vacant	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
efc00026-c564-4fe1-86ef-f7062838c5bf	95fea72f-554b-4031-9d37-0dfd742602ce	KR17	3	2.0	1400	150000.00	150000.00	vacant	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
b8850ae3-5e1d-4f3c-aeeb-ad65eb1ec44b	95fea72f-554b-4031-9d37-0dfd742602ce	KR18	4	3.0	1800	200000.00	200000.00	occupied	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
93a1c8b6-1575-453b-8374-4b3a33f9ad3b	95fea72f-554b-4031-9d37-0dfd742602ce	KR19	3	2.0	1400	150000.00	150000.00	vacant	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
31fe07c3-55ea-433d-95f9-3967335731a4	95fea72f-554b-4031-9d37-0dfd742602ce	KR20	4	3.0	1800	200000.00	200000.00	vacant	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
8a4d6182-c665-4a0b-8261-fbdc70581128	95fea72f-554b-4031-9d37-0dfd742602ce	KR21	3	2.0	1400	150000.00	150000.00	occupied	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
b6d114fd-85ef-4982-a3d0-db29c6ced681	95fea72f-554b-4031-9d37-0dfd742602ce	KR22	4	3.0	1800	200000.00	200000.00	vacant	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
e9014cca-dc56-4ecd-b0b0-b483793f8f49	95fea72f-554b-4031-9d37-0dfd742602ce	KR23	3	2.0	1400	150000.00	150000.00	vacant	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
fdc941da-3766-4fde-8f1c-24ef0a13d1aa	95fea72f-554b-4031-9d37-0dfd742602ce	KR24	4	3.0	1800	200000.00	200000.00	occupied	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
4c2f723a-a504-46a0-9606-9ce9299edf3b	95fea72f-554b-4031-9d37-0dfd742602ce	KR25	3	2.0	1400	150000.00	150000.00	vacant	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
4170d4fb-0551-4dee-be17-a6ea6dec8fa5	95fea72f-554b-4031-9d37-0dfd742602ce	KR26	4	3.0	1800	200000.00	200000.00	vacant	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
10847060-4776-4da9-bdc6-0afb8b4ddf6a	95fea72f-554b-4031-9d37-0dfd742602ce	KR27	3	2.0	1400	150000.00	150000.00	occupied	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
7be8272a-308e-4d27-825e-b6414c72dde1	95fea72f-554b-4031-9d37-0dfd742602ce	KR28	4	3.0	1800	200000.00	200000.00	vacant	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
b4e4cf38-8eee-4372-95ea-222e6c673e10	95fea72f-554b-4031-9d37-0dfd742602ce	KR29	3	2.0	1400	150000.00	150000.00	vacant	Three bedroom townhouse with private garden and garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
6f20cb6f-5921-45c2-acae-35aa05da35a7	95fea72f-554b-4031-9d37-0dfd742602ce	KR30	4	3.0	1800	200000.00	200000.00	occupied	Four bedroom luxury townhouse with study and double garage	2025-08-27 15:50:49.882503	2025-08-27 15:50:49.882503	\N	\N	f	\N	\N
6f74eeec-6a1e-4f13-8b55-dbedd3631db0	578b1474-3fe1-4e79-b183-c41ef571a2de	MM1	1	1.0	550	55000.00	55000.00	vacant	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
92bb9721-7bf0-47bd-a534-466a5a22d7f5	578b1474-3fe1-4e79-b183-c41ef571a2de	MM2	2	2.0	750	75000.00	75000.00	vacant	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
58e9fe45-dc78-4d22-a033-7d9f69266cdd	578b1474-3fe1-4e79-b183-c41ef571a2de	MM3	3	3.0	1000	95000.00	95000.00	vacant	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
2ec57d12-16f8-443e-91a5-cd76a0266413	578b1474-3fe1-4e79-b183-c41ef571a2de	MM4	1	1.0	550	55000.00	55000.00	occupied	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
7956c7c9-e26e-44db-9fc1-3d1be61af35e	578b1474-3fe1-4e79-b183-c41ef571a2de	MM5	2	2.0	750	75000.00	75000.00	vacant	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
8f361cab-4b45-4fd3-adf9-1d50199e56a6	578b1474-3fe1-4e79-b183-c41ef571a2de	MM6	3	3.0	1000	95000.00	95000.00	vacant	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
8cf58f88-f7ae-4306-850f-f932303ae6cf	578b1474-3fe1-4e79-b183-c41ef571a2de	MM7	1	1.0	550	55000.00	55000.00	vacant	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
c8ab533e-a79d-4ac0-a120-3a45d54ba49b	578b1474-3fe1-4e79-b183-c41ef571a2de	MM8	2	2.0	750	75000.00	75000.00	occupied	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
f58ddd44-dfdc-4bfb-8d6b-55630c775d94	578b1474-3fe1-4e79-b183-c41ef571a2de	MM9	3	3.0	1000	95000.00	95000.00	vacant	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
cd6864ea-a36a-4086-b180-887cd0a5a2d4	578b1474-3fe1-4e79-b183-c41ef571a2de	MM10	1	1.0	550	55000.00	55000.00	vacant	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
ec52df2e-96b6-4be0-a546-24a56df9bb41	578b1474-3fe1-4e79-b183-c41ef571a2de	MM11	2	2.0	750	75000.00	75000.00	vacant	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
390e3633-f3ed-4c43-8961-14ad7630635b	578b1474-3fe1-4e79-b183-c41ef571a2de	MM12	3	3.0	1000	95000.00	95000.00	occupied	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
d90c3f4d-f61c-40c3-a02e-fa3b39b11fca	578b1474-3fe1-4e79-b183-c41ef571a2de	MM13	1	1.0	550	55000.00	55000.00	vacant	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
e8d90c03-ee32-4d45-919e-c38a99470b6d	578b1474-3fe1-4e79-b183-c41ef571a2de	MM14	2	2.0	750	75000.00	75000.00	vacant	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
99c925b4-b8e0-4807-b41b-e54949d5dc0d	578b1474-3fe1-4e79-b183-c41ef571a2de	MM15	3	3.0	1000	95000.00	95000.00	vacant	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
bcf094f9-3411-45e7-9fd8-21f7268ebd4f	578b1474-3fe1-4e79-b183-c41ef571a2de	MM16	1	1.0	550	55000.00	55000.00	occupied	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
867302b4-d41b-4165-97f3-dbe61b1c4aab	578b1474-3fe1-4e79-b183-c41ef571a2de	MM17	2	2.0	750	75000.00	75000.00	vacant	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
5aff375c-3621-4afd-9748-485e9e268408	578b1474-3fe1-4e79-b183-c41ef571a2de	MM18	3	3.0	1000	95000.00	95000.00	vacant	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
b83f8649-39df-4b0d-9216-47837bc037db	578b1474-3fe1-4e79-b183-c41ef571a2de	MM19	1	1.0	550	55000.00	55000.00	vacant	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
5150140a-19f5-48eb-919c-f4c955efb590	578b1474-3fe1-4e79-b183-c41ef571a2de	MM20	2	2.0	750	75000.00	75000.00	occupied	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
41c044a1-7b23-4470-b2ea-dffae12ed79f	578b1474-3fe1-4e79-b183-c41ef571a2de	MM21	3	3.0	1000	95000.00	95000.00	vacant	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
5a3281b4-ea67-4893-b90e-d72853054361	578b1474-3fe1-4e79-b183-c41ef571a2de	MM22	1	1.0	550	55000.00	55000.00	vacant	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
d14db335-ca9e-4dec-b445-78e9d77e241e	578b1474-3fe1-4e79-b183-c41ef571a2de	MM23	2	2.0	750	75000.00	75000.00	vacant	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
5619e024-4968-4515-967b-07680e771b8b	578b1474-3fe1-4e79-b183-c41ef571a2de	MM24	3	3.0	1000	95000.00	95000.00	occupied	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
af69cd36-95cd-4051-b8b7-a57288b5c0c8	578b1474-3fe1-4e79-b183-c41ef571a2de	MM25	1	1.0	550	55000.00	55000.00	vacant	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
f3b22089-de31-4236-9fe7-bc8c8e052bbb	578b1474-3fe1-4e79-b183-c41ef571a2de	MM26	2	2.0	750	75000.00	75000.00	vacant	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
c420fca1-2a07-4f5f-a4ef-a7afb8f5c858	578b1474-3fe1-4e79-b183-c41ef571a2de	MM27	3	3.0	1000	95000.00	95000.00	vacant	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
c454cac2-c44b-40ca-aedc-2f6fd66837bf	578b1474-3fe1-4e79-b183-c41ef571a2de	MM28	1	1.0	550	55000.00	55000.00	occupied	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
5840ae60-01fc-4671-9b76-4ef495d15ca5	578b1474-3fe1-4e79-b183-c41ef571a2de	MM29	2	2.0	750	75000.00	75000.00	vacant	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
c6f2a24c-3fd7-45a1-a2aa-317dd1050e62	578b1474-3fe1-4e79-b183-c41ef571a2de	MM30	3	3.0	1000	95000.00	95000.00	vacant	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
fa64c5f2-0fbc-4a95-97da-fca804737115	578b1474-3fe1-4e79-b183-c41ef571a2de	MM31	1	1.0	550	55000.00	55000.00	vacant	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
6932538b-efbe-486e-96d1-305ab395eed3	578b1474-3fe1-4e79-b183-c41ef571a2de	MM32	2	2.0	750	75000.00	75000.00	occupied	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
3967a988-b859-49e0-a160-9f90d342ba4b	578b1474-3fe1-4e79-b183-c41ef571a2de	MM33	3	3.0	1000	95000.00	95000.00	vacant	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
2992c9f6-e1e3-48de-a414-c07311bc2829	578b1474-3fe1-4e79-b183-c41ef571a2de	MM34	1	1.0	550	55000.00	55000.00	vacant	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
3c577923-ef10-4d5c-a97f-9c44f52ec7bc	578b1474-3fe1-4e79-b183-c41ef571a2de	MM35	2	2.0	750	75000.00	75000.00	vacant	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
8d59faaf-e17a-43ba-8a24-f247738de10a	578b1474-3fe1-4e79-b183-c41ef571a2de	MM36	3	3.0	1000	95000.00	95000.00	occupied	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
0df487c7-0e62-40c8-8d50-b0cc5213a551	578b1474-3fe1-4e79-b183-c41ef571a2de	MM37	1	1.0	550	55000.00	55000.00	vacant	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
b37e8ae9-d9d5-4d75-91a2-b388797c0a53	578b1474-3fe1-4e79-b183-c41ef571a2de	MM38	2	2.0	750	75000.00	75000.00	vacant	Two bedroom with full ocean views and terrace	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
508e141e-fc73-4438-afdb-56dc8c409925	578b1474-3fe1-4e79-b183-c41ef571a2de	MM39	3	3.0	1000	95000.00	95000.00	vacant	Three bedroom beachfront with panoramic ocean views	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
14974ae1-8db6-4d9e-9988-bc9285d571ee	578b1474-3fe1-4e79-b183-c41ef571a2de	MM40	1	1.0	550	55000.00	55000.00	occupied	One bedroom with partial ocean views and balcony	2025-08-27 15:50:55.707289	2025-08-27 15:50:55.707289	\N	\N	f	\N	\N
8c1ff21e-00a3-42a4-bcd0-50594b5c3ecd	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG1	1	1.0	500	30000.00	30000.00	vacant	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
2ef5e14c-6fb5-4519-bb9c-9dc0fa592b98	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG2	2	2.0	700	45000.00	45000.00	vacant	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
8415d114-ab3e-4b0e-9147-69afd21d46b9	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG3	3	2.0	900	60000.00	60000.00	vacant	Three bedroom with private balcony and storage	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
bd30c33e-48ec-4332-b94d-82eb46f05cb1	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG4	1	1.0	500	30000.00	30000.00	occupied	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
f6875b9c-a2fe-4b25-b76e-33b002e6c382	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG5	2	2.0	700	45000.00	45000.00	vacant	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
1f3949d2-fe64-466a-af7b-e7e0288ad607	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG6	3	2.0	900	60000.00	60000.00	vacant	Three bedroom with private balcony and storage	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
3e1fd5a6-3271-4258-9863-a6526ba1b8e9	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG7	1	1.0	500	30000.00	30000.00	vacant	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
d6951e42-c43e-4c34-b5b3-ada8aa748f64	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG8	2	2.0	700	45000.00	45000.00	occupied	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
a1ea5038-b35b-4dbc-b010-43b931207e18	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG9	3	2.0	900	60000.00	60000.00	vacant	Three bedroom with private balcony and storage	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
4cf51321-67a3-4aff-8e31-e2abecce09a2	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG10	1	1.0	500	30000.00	30000.00	vacant	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
3e3c4e54-531a-4c75-a19d-4b2df7134624	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG11	2	2.0	700	45000.00	45000.00	vacant	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
fb325e5f-9c16-4c82-ac7c-a3fa40bd50f5	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG12	3	2.0	900	60000.00	60000.00	occupied	Three bedroom with private balcony and storage	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
38441d1d-3f39-4a8c-94b8-321372f629a5	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG13	1	1.0	500	30000.00	30000.00	vacant	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
0103795a-06ce-40e0-bde9-87729e5db5b8	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG14	2	2.0	700	45000.00	45000.00	vacant	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
1f36187b-14a8-4d6c-aec5-89e69412542e	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG15	3	2.0	900	60000.00	60000.00	vacant	Three bedroom with private balcony and storage	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
1ac0afb6-bed1-4b97-82a5-d13e0a58e00e	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG16	1	1.0	500	30000.00	30000.00	occupied	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
3b3458b7-b528-4bc0-a869-77102f1824dd	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG17	2	2.0	700	45000.00	45000.00	vacant	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
d91f8b98-c174-4e98-8021-dfb4f464960d	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG18	3	2.0	900	60000.00	60000.00	vacant	Three bedroom with private balcony and storage	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
a86e4ccd-e3a5-4476-a099-a3cf077d8800	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG19	1	1.0	500	30000.00	30000.00	vacant	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
52a9c527-3963-4974-bb4f-5b208b9edbd1	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG20	2	2.0	700	45000.00	45000.00	occupied	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
be3fd0e2-8a7a-474b-b3ea-7494be8c5b9d	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG21	3	2.0	900	60000.00	60000.00	vacant	Three bedroom with private balcony and storage	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
93800b1b-1775-4d3a-a4d4-891af4a67e83	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG22	1	1.0	500	30000.00	30000.00	vacant	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
96bf5d26-6cd8-4caa-8d46-6fab88b67770	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG23	2	2.0	700	45000.00	45000.00	vacant	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
950d7dd6-bb26-4499-9637-192ffa20f53d	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG24	3	2.0	900	60000.00	60000.00	occupied	Three bedroom with private balcony and storage	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
e4e3a146-bfbf-492c-8427-b06055ca4bf3	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG25	1	1.0	500	30000.00	30000.00	vacant	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
af998f41-33ec-4c5d-8d70-f150540b1160	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG26	2	2.0	700	45000.00	45000.00	vacant	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
b38f96de-99ec-4218-923a-d5b9f45dfb9b	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG27	3	2.0	900	60000.00	60000.00	vacant	Three bedroom with private balcony and storage	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
a88b7968-1809-49a1-80c1-5aa10f0e1614	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG28	1	1.0	500	30000.00	30000.00	occupied	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
267b28dd-e002-4a86-912f-87bbec1aa07d	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG29	2	2.0	700	45000.00	45000.00	vacant	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
12ce9a95-32a8-4a10-9054-3904832656fd	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG30	3	2.0	900	60000.00	60000.00	vacant	Three bedroom with private balcony and storage	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
36edd786-e9fe-4556-aed2-1f5bd4c5b935	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG31	1	1.0	500	30000.00	30000.00	vacant	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
fc03ab4f-ec74-4f91-99f0-79778b8a0376	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG32	2	2.0	700	45000.00	45000.00	occupied	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
58463e09-9c49-4c48-af68-161f788ec0d3	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG33	3	2.0	900	60000.00	60000.00	vacant	Three bedroom with private balcony and storage	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
8a4f5fc5-8c91-4b99-b146-c26c3bf9d4fc	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG34	1	1.0	500	30000.00	30000.00	vacant	One bedroom with garden access and parking	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
3d9757af-acdc-4801-bce6-86a51e1b8359	0fa869e8-1d07-4c82-bcfc-9e31b77373fd	NG35	2	2.0	700	45000.00	45000.00	vacant	Two bedroom family unit with playground access	2025-08-27 15:51:08.060753	2025-08-27 15:51:08.060753	\N	\N	f	\N	\N
e2fa4f9c-3b1e-4cdf-bfec-980154078802	e6248e10-7d91-4f2c-8202-a3516c554478	EP2	2	1.0	650	35000.00	35000.00	vacant	Two bedroom with modern kitchen and backup power	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
93458582-b532-4c44-bf89-ccc7a75a52f4	e6248e10-7d91-4f2c-8202-a3516c554478	EP3	3	2.0	850	50000.00	50000.00	occupied	Three bedroom with master ensuite and city views	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
7a4bdce4-5aa8-4a65-b7dd-6400a09aeac5	e6248e10-7d91-4f2c-8202-a3516c554478	EP4	1	1.0	480	25000.00	25000.00	vacant	One bedroom apartment near town center with parking	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
dbc7e526-a995-4f4c-927e-7b2f20c57a4e	e6248e10-7d91-4f2c-8202-a3516c554478	EP5	2	1.0	650	35000.00	35000.00	vacant	Two bedroom with modern kitchen and backup power	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
01debb6b-9e5a-4b6c-a1b5-c9593d959bfd	e6248e10-7d91-4f2c-8202-a3516c554478	EP6	3	2.0	850	50000.00	50000.00	occupied	Three bedroom with master ensuite and city views	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
c0002339-0f34-4536-8f55-4c2570efc7fe	e6248e10-7d91-4f2c-8202-a3516c554478	EP7	1	1.0	480	25000.00	25000.00	vacant	One bedroom apartment near town center with parking	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
339d9d86-a18a-4bb1-8f85-af31d9d62411	e6248e10-7d91-4f2c-8202-a3516c554478	EP8	2	1.0	650	35000.00	35000.00	vacant	Two bedroom with modern kitchen and backup power	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
812a1099-b5b4-4b71-9ed7-bf2c3863e6fc	e6248e10-7d91-4f2c-8202-a3516c554478	EP9	3	2.0	850	50000.00	50000.00	occupied	Three bedroom with master ensuite and city views	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
c0e705e1-bfb3-40e7-ab60-653610303e58	e6248e10-7d91-4f2c-8202-a3516c554478	EP10	1	1.0	480	25000.00	25000.00	vacant	One bedroom apartment near town center with parking	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
313a491b-9644-478d-8860-97b184c9da8c	e6248e10-7d91-4f2c-8202-a3516c554478	EP11	2	1.0	650	35000.00	35000.00	vacant	Two bedroom with modern kitchen and backup power	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
0cca6cf6-04d1-433a-8d98-2f7ba8fa4354	e6248e10-7d91-4f2c-8202-a3516c554478	EP12	3	2.0	850	50000.00	50000.00	occupied	Three bedroom with master ensuite and city views	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
6d243dca-f7e5-4608-93b6-03fd5cabdc38	e6248e10-7d91-4f2c-8202-a3516c554478	EP13	1	1.0	480	25000.00	25000.00	vacant	One bedroom apartment near town center with parking	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
579511fd-d630-4279-98aa-633a3223eec7	e6248e10-7d91-4f2c-8202-a3516c554478	EP14	2	1.0	650	35000.00	35000.00	vacant	Two bedroom with modern kitchen and backup power	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
04c1a122-4f7f-4c64-942c-8d9cc5bf223e	e6248e10-7d91-4f2c-8202-a3516c554478	EP15	3	2.0	850	50000.00	50000.00	occupied	Three bedroom with master ensuite and city views	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
a9190f9f-e49a-423e-b798-ee5fba88cadf	e6248e10-7d91-4f2c-8202-a3516c554478	EP16	1	1.0	480	25000.00	25000.00	vacant	One bedroom apartment near town center with parking	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
41617cbe-0e5d-4341-a2b0-c03f977c14a2	e6248e10-7d91-4f2c-8202-a3516c554478	EP17	2	1.0	650	35000.00	35000.00	vacant	Two bedroom with modern kitchen and backup power	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
1ba4d2fa-bf44-4fbd-b174-5581b38cd16f	e6248e10-7d91-4f2c-8202-a3516c554478	EP18	3	2.0	850	50000.00	50000.00	occupied	Three bedroom with master ensuite and city views	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
d15ecbd7-4f65-472e-9d8d-b12cd3797ec0	e6248e10-7d91-4f2c-8202-a3516c554478	EP19	1	1.0	480	25000.00	25000.00	vacant	One bedroom apartment near town center with parking	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
e4945474-4df8-46e6-a377-08391ba7b16a	e6248e10-7d91-4f2c-8202-a3516c554478	EP20	2	1.0	650	35000.00	35000.00	vacant	Two bedroom with modern kitchen and backup power	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
089bc1fa-71a0-4ae6-b7fe-4d0d68e1b7e3	e6248e10-7d91-4f2c-8202-a3516c554478	EP21	3	2.0	850	50000.00	50000.00	occupied	Three bedroom with master ensuite and city views	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
ebc75b68-6ebe-4f21-9c53-d541d9326ca5	e6248e10-7d91-4f2c-8202-a3516c554478	EP22	1	1.0	480	25000.00	25000.00	vacant	One bedroom apartment near town center with parking	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
810e3926-0639-4d4c-a8d6-99bf82198876	e6248e10-7d91-4f2c-8202-a3516c554478	EP23	2	1.0	650	35000.00	35000.00	vacant	Two bedroom with modern kitchen and backup power	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
329fd9ea-aefd-4315-af49-9295aa29a0e7	e6248e10-7d91-4f2c-8202-a3516c554478	EP24	3	2.0	850	50000.00	50000.00	occupied	Three bedroom with master ensuite and city views	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
4ec2507b-d25c-42ca-8646-21302e7434dc	e6248e10-7d91-4f2c-8202-a3516c554478	EP25	1	1.0	480	25000.00	25000.00	vacant	One bedroom apartment near town center with parking	2025-08-27 15:51:13.893333	2025-08-27 15:51:13.893333	\N	\N	f	\N	\N
22bc6730-73bc-497d-a076-a089ec17cdf1	582accb6-1b22-4afe-906b-0341a6970007	KL1	1	1.0	520	35000.00	35000.00	vacant	One bedroom with partial lake views and parking	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
3a78bbad-89d4-4c99-bdec-a1657ff7a1c6	582accb6-1b22-4afe-906b-0341a6970007	KL2	2	2.0	720	50000.00	50000.00	vacant	Two bedroom with lake view balcony and modern fittings	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
f55523d1-47bf-4e96-916d-ec824ec2f35d	582accb6-1b22-4afe-906b-0341a6970007	KL3	3	2.0	920	65000.00	65000.00	vacant	Three bedroom with panoramic lake views and study	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
99a2489c-1b32-4e9b-9ab4-c84ea7c55d31	582accb6-1b22-4afe-906b-0341a6970007	KL4	1	1.0	520	35000.00	35000.00	occupied	One bedroom with partial lake views and parking	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
b40510d7-77bc-46d2-bdaa-dc7ebb35cbd6	582accb6-1b22-4afe-906b-0341a6970007	KL5	2	2.0	720	50000.00	50000.00	vacant	Two bedroom with lake view balcony and modern fittings	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
de99997f-92b5-481a-8725-0c452126e955	582accb6-1b22-4afe-906b-0341a6970007	KL6	3	2.0	920	65000.00	65000.00	vacant	Three bedroom with panoramic lake views and study	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
b00181cc-4d8c-482f-821b-04a69d521d86	582accb6-1b22-4afe-906b-0341a6970007	KL7	1	1.0	520	35000.00	35000.00	vacant	One bedroom with partial lake views and parking	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
e9d979f9-776d-47b8-906c-c9275f413124	582accb6-1b22-4afe-906b-0341a6970007	KL8	2	2.0	720	50000.00	50000.00	occupied	Two bedroom with lake view balcony and modern fittings	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
0a1bc7ad-292d-435f-991f-120804cd8aba	582accb6-1b22-4afe-906b-0341a6970007	KL9	3	2.0	920	65000.00	65000.00	vacant	Three bedroom with panoramic lake views and study	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
ecde77fe-fc3c-4179-aae7-f72704823bf5	582accb6-1b22-4afe-906b-0341a6970007	KL10	1	1.0	520	35000.00	35000.00	vacant	One bedroom with partial lake views and parking	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
a7173203-5604-442c-b469-840b561ade8d	582accb6-1b22-4afe-906b-0341a6970007	KL11	2	2.0	720	50000.00	50000.00	vacant	Two bedroom with lake view balcony and modern fittings	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
1164afdb-9863-4e9c-9cf8-6beecb928024	582accb6-1b22-4afe-906b-0341a6970007	KL12	3	2.0	920	65000.00	65000.00	occupied	Three bedroom with panoramic lake views and study	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
52470c93-a49b-438a-9b81-b65f41621683	582accb6-1b22-4afe-906b-0341a6970007	KL13	1	1.0	520	35000.00	35000.00	vacant	One bedroom with partial lake views and parking	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
be86d2ab-27ba-413d-acf4-742c4ae9475a	582accb6-1b22-4afe-906b-0341a6970007	KL14	2	2.0	720	50000.00	50000.00	vacant	Two bedroom with lake view balcony and modern fittings	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
9df9d46f-f169-4825-9a78-0434a6a42b93	582accb6-1b22-4afe-906b-0341a6970007	KL15	3	2.0	920	65000.00	65000.00	vacant	Three bedroom with panoramic lake views and study	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
33c84fb7-0069-473f-a602-41b5312ccf39	582accb6-1b22-4afe-906b-0341a6970007	KL16	1	1.0	520	35000.00	35000.00	occupied	One bedroom with partial lake views and parking	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
5e95062c-d660-4ac5-99cb-f826ef7a7c3a	582accb6-1b22-4afe-906b-0341a6970007	KL17	2	2.0	720	50000.00	50000.00	vacant	Two bedroom with lake view balcony and modern fittings	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
4a959693-2450-4567-ba2d-77b1ee5f6b5e	582accb6-1b22-4afe-906b-0341a6970007	KL18	3	2.0	920	65000.00	65000.00	vacant	Three bedroom with panoramic lake views and study	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
e64d6bfa-c646-44f2-b03e-ae8e9728deaa	582accb6-1b22-4afe-906b-0341a6970007	KL19	1	1.0	520	35000.00	35000.00	vacant	One bedroom with partial lake views and parking	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
75bc941a-2f26-4f7c-8be3-165f6d485188	582accb6-1b22-4afe-906b-0341a6970007	KL20	2	2.0	720	50000.00	50000.00	occupied	Two bedroom with lake view balcony and modern fittings	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
044ab1d9-ee08-4d6c-8c3e-e33606831fe0	582accb6-1b22-4afe-906b-0341a6970007	KL21	3	2.0	920	65000.00	65000.00	vacant	Three bedroom with panoramic lake views and study	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
b7600294-e4af-4e51-be35-d4552e6a7bb1	582accb6-1b22-4afe-906b-0341a6970007	KL22	1	1.0	520	35000.00	35000.00	vacant	One bedroom with partial lake views and parking	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
1a8c011c-9e00-4028-bb5a-666a97a62df3	582accb6-1b22-4afe-906b-0341a6970007	KL23	2	2.0	720	50000.00	50000.00	vacant	Two bedroom with lake view balcony and modern fittings	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
88bb8ad8-4a23-49a2-9d65-02e51e6dd288	582accb6-1b22-4afe-906b-0341a6970007	KL24	3	2.0	920	65000.00	65000.00	occupied	Three bedroom with panoramic lake views and study	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
7546fcba-46ce-4e74-80c5-8d97703ef8cd	582accb6-1b22-4afe-906b-0341a6970007	KL25	1	1.0	520	35000.00	35000.00	vacant	One bedroom with partial lake views and parking	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
f95624d2-6750-4d14-a12d-b77b03c086cd	582accb6-1b22-4afe-906b-0341a6970007	KL26	2	2.0	720	50000.00	50000.00	vacant	Two bedroom with lake view balcony and modern fittings	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
6191cfe6-6313-40a9-bb83-6d3034e5a536	582accb6-1b22-4afe-906b-0341a6970007	KL27	3	2.0	920	65000.00	65000.00	vacant	Three bedroom with panoramic lake views and study	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
fe7afe0d-7c74-4e32-80aa-5a6bfa4e0882	582accb6-1b22-4afe-906b-0341a6970007	KL28	1	1.0	520	35000.00	35000.00	occupied	One bedroom with partial lake views and parking	2025-08-27 15:51:28.964549	2025-08-27 15:51:28.964549	\N	\N	f	\N	\N
74a6c14d-4fae-411d-a095-e5cc5802e602	be90c356-3891-49df-be09-c1010573732c	TGV1	3	2.0	1200	55000.00	55000.00	vacant	Three bedroom house with private garden and parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
6a40377e-5989-47d2-a1d1-72f07d2b8b91	be90c356-3891-49df-be09-c1010573732c	TGV2	4	3.0	1500	75000.00	75000.00	vacant	Four bedroom house with compound, garden and double parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
eac4183e-375e-4bb0-aceb-4d8ad550b9c8	be90c356-3891-49df-be09-c1010573732c	TGV3	3	2.0	1200	55000.00	55000.00	occupied	Three bedroom house with private garden and parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
c0640ea1-4047-47f1-9dfa-15eca9fdbcd6	be90c356-3891-49df-be09-c1010573732c	TGV4	4	3.0	1500	75000.00	75000.00	vacant	Four bedroom house with compound, garden and double parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
dad8849b-308e-4418-b4bf-461eeba9ab93	be90c356-3891-49df-be09-c1010573732c	TGV5	3	2.0	1200	55000.00	55000.00	vacant	Three bedroom house with private garden and parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
2ec0fc56-eee9-4b55-a73f-bd5336150f58	be90c356-3891-49df-be09-c1010573732c	TGV6	4	3.0	1500	75000.00	75000.00	occupied	Four bedroom house with compound, garden and double parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
9a6897e7-80f3-4f74-b65c-f2c0e7e0c198	be90c356-3891-49df-be09-c1010573732c	TGV7	3	2.0	1200	55000.00	55000.00	vacant	Three bedroom house with private garden and parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
4c541825-b6d5-43a3-b9bb-0267d0ba7463	be90c356-3891-49df-be09-c1010573732c	TGV8	4	3.0	1500	75000.00	75000.00	vacant	Four bedroom house with compound, garden and double parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
9133c0b8-7bd2-448a-a530-e9ab6f135300	be90c356-3891-49df-be09-c1010573732c	TGV9	3	2.0	1200	55000.00	55000.00	occupied	Three bedroom house with private garden and parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
5985c287-d5c8-42d5-a53c-0acd9c74e7ab	be90c356-3891-49df-be09-c1010573732c	TGV10	4	3.0	1500	75000.00	75000.00	vacant	Four bedroom house with compound, garden and double parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
7ba1805b-ddea-4ed6-ac73-4ddac6aeac63	be90c356-3891-49df-be09-c1010573732c	TGV11	3	2.0	1200	55000.00	55000.00	vacant	Three bedroom house with private garden and parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
175f18fb-998d-4b31-b433-5140f42d1a9d	be90c356-3891-49df-be09-c1010573732c	TGV12	4	3.0	1500	75000.00	75000.00	occupied	Four bedroom house with compound, garden and double parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
673180b3-6327-4600-ad89-d178061c1d45	be90c356-3891-49df-be09-c1010573732c	TGV13	3	2.0	1200	55000.00	55000.00	vacant	Three bedroom house with private garden and parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
4c11428b-f2c0-46d0-a507-ebb5f3615f09	be90c356-3891-49df-be09-c1010573732c	TGV14	4	3.0	1500	75000.00	75000.00	vacant	Four bedroom house with compound, garden and double parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
2afed5d6-3088-49f8-ab4f-d3a90d7e0a76	be90c356-3891-49df-be09-c1010573732c	TGV15	3	2.0	1200	55000.00	55000.00	occupied	Three bedroom house with private garden and parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
318658c4-1e4d-4c07-a649-f333a5f11f1b	be90c356-3891-49df-be09-c1010573732c	TGV16	4	3.0	1500	75000.00	75000.00	vacant	Four bedroom house with compound, garden and double parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
4c91ef87-77ad-4dac-91b7-be5e9cd75416	be90c356-3891-49df-be09-c1010573732c	TGV17	3	2.0	1200	55000.00	55000.00	vacant	Three bedroom house with private garden and parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
6b181946-490d-4016-97ce-9b2139055999	be90c356-3891-49df-be09-c1010573732c	TGV18	4	3.0	1500	75000.00	75000.00	occupied	Four bedroom house with compound, garden and double parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
7e2151c9-0a2e-40a7-a547-c36db44a687f	be90c356-3891-49df-be09-c1010573732c	TGV19	3	2.0	1200	55000.00	55000.00	vacant	Three bedroom house with private garden and parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
e6f330b1-a3c8-4a98-a9c4-ddb8c90f57b5	be90c356-3891-49df-be09-c1010573732c	TGV20	4	3.0	1500	75000.00	75000.00	vacant	Four bedroom house with compound, garden and double parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
b585bb43-bbb5-4eae-9af0-0bda3d3cab57	be90c356-3891-49df-be09-c1010573732c	TGV21	3	2.0	1200	55000.00	55000.00	occupied	Three bedroom house with private garden and parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
0de02451-8c64-4eb2-9405-64304e64bce8	be90c356-3891-49df-be09-c1010573732c	TGV22	4	3.0	1500	75000.00	75000.00	vacant	Four bedroom house with compound, garden and double parking	2025-08-27 15:51:34.142468	2025-08-27 15:51:34.142468	\N	\N	f	\N	\N
3272fc9a-62a2-44bf-82c8-b0e858afcfc8	1b04e021-6f5c-40dc-aa52-f5d4a9e4da71	20A	1	1.0	\N	20000.00	20000.00	vacant	\N	2025-08-28 12:19:15.817055	2025-08-28 12:19:15.817055	\N	\N	f	\N	\N
f344f75e-6f7e-401a-9a27-b3d3085f9f87	e6248e10-7d91-4f2c-8202-a3516c554478	EP1	1	1.0	480	25000.00	25000.00	occupied	One bedroom apartment near town center with parking	2025-08-27 15:51:13.893333	2025-08-28 14:49:18.916	\N	\N	f	\N	\N
9cb3146d-8193-4995-834f-2ebd31bbbc5a	f228b0b2-57fa-48de-989d-98d2a9bd91a0	A101	2	2.0	800	45000.00	90000.00	vacant	\N	2025-08-28 15:00:25.777827	2025-08-28 15:00:25.777827	\N	\N	f	\N	\N
e64868aa-0c0c-47a8-9585-050fea8ec3b2	f228b0b2-57fa-48de-989d-98d2a9bd91a0	A102	3	2.0	1000	50000.00	100000.00	vacant	\N	2025-08-28 15:00:27.460533	2025-08-28 15:00:27.460533	\N	\N	f	\N	\N
329c2ca1-6453-45e6-8876-5933e19783cc	f40d3576-94da-47bb-9b8b-fbc59d793b35	TH01	4	3.0	1500	75000.00	150000.00	vacant	\N	2025-08-28 15:00:29.434859	2025-08-28 15:00:29.434859	\N	\N	f	\N	\N
28b5daac-7beb-491b-abe7-52f9d5c0f9c4	861621ec-f769-4be8-98d9-92a006a1ce99	Shop-G1	0	1.0	600	120000.00	240000.00	vacant	\N	2025-08-28 15:00:31.391898	2025-08-28 15:00:31.391898	\N	\N	f	\N	\N
\.


--
-- Data for Name: user_access_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_access_requests (id, email, first_name, last_name, phone, requested_role, reason, status, reviewed_by, reviewed_at, review_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, first_name, last_name, role, phone, is_active, created_at, updated_at, replit_id, username, password_hash, is_approved, approved_by, approved_at, national_id, kra_pin, alternate_phone, emergency_contact_name, emergency_contact_phone, is_deleted, deleted_at, deleted_by) FROM stdin;
524633e8-667b-4a00-9346-25c7fe8e3e54	john.doe@example.com	John	Doe	tenant	555-123-4567	t	2025-08-27 14:46:16.369373	2025-08-27 14:46:16.369373	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
9975884a-6ff5-4bdd-b05d-822b00dac43d	superadmin@school.com	Kwame	Alex	tenant	0867768723943	t	2025-08-27 15:02:44.380938	2025-08-27 15:02:44.380938	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
8c6c5d2a-c1c8-4cd6-a973-2e6b2f2e6246	test@example.com	Test	User	tenant	123456789	t	2025-08-27 15:15:51.187544	2025-08-27 15:15:51.187544	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
aca97846-a7d3-413d-ad79-05336a6cf855	admin@school.co.ke	Kwame	Achieng	tenant	2345675	t	2025-08-27 15:26:29.406902	2025-08-27 15:26:29.406902	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
11ca1000-416a-4fe9-8561-f6bf6b204d90	test2@example.com	Test	User	tenant	123456789	t	2025-08-27 15:30:12.168795	2025-08-27 15:30:12.168795	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
e5936f37-2444-47c2-a6e0-0d91653f4778	test3@example.com	Test	User	tenant	123456789	t	2025-08-27 15:30:43.14318	2025-08-27 15:30:43.14318	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
22307b85-7924-4e90-a425-a357ac985605	test4@example.com	Test	User	tenant	123456789	t	2025-08-27 15:30:57.433485	2025-08-27 15:30:57.433485	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
e892fbb8-a5df-4609-88c9-c11a053c0545	wanjiku.kamau@gmail.com	Wanjiku	Kamau	tenant	+254712345678	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
e8684c18-858f-4271-a1c6-9d622b77c471	peter.mungai@yahoo.com	Peter	Mungai	tenant	+254723456789	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
fe12078e-6109-43c0-9f17-c368a74c8b84	grace.wanjiru@gmail.com	Grace	Wanjiru	tenant	+254734567890	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
952deed1-8b27-46f9-bd1c-bf714005dcee	john.githuku@hotmail.com	John	Githuku	tenant	+254745678901	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
6e7e3832-a88b-40e9-8a10-639edcd5c0f5	achieng.ochieng@gmail.com	Achieng	Ochieng	tenant	+254756789012	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
f1fde305-ced4-401c-bc39-fce79e072647	dennis.otieno@gmail.com	Dennis	Otieno	tenant	+254767890123	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
1e9b62ef-af49-49fd-8acd-de1ca6c2db90	purity.awino@yahoo.com	Purity	Awino	tenant	+254778901234	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
67facb85-77b9-415d-a1a9-57903c253fc1	victor.odhiambo@gmail.com	Victor	Odhiambo	tenant	+254789012345	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
35c04af0-929d-4f6a-8f26-86b27c9bdc89	beatrice.wekesa@gmail.com	Beatrice	Wekesa	tenant	+254790123456	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
1384fd1f-75a5-409c-83ef-2106fe0878fc	martin.wanjala@hotmail.com	Martin	Wanjala	tenant	+254701234567	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
0364ee40-4e41-4719-bce5-d5784162ccf6	sylvia.nafula@gmail.com	Sylvia	Nafula	tenant	+254712345670	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
71cc0994-d62e-46bc-ac1c-8008a794cad3	evans.barasa@yahoo.com	Evans	Barasa	tenant	+254723456701	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
4f10e94b-023e-4757-b523-15740c534cea	mercy.kipchoge@gmail.com	Mercy	Kipchoge	tenant	+254734567012	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
a332d5a7-b2f9-4696-9df1-67d59a6f76f1	daniel.ruto@gmail.com	Daniel	Ruto	tenant	+254745678023	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
33c6dbd3-3517-4cd3-97d1-bf2d7357d8b7	faith.chebet@hotmail.com	Faith	Chebet	tenant	+254756789034	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
85ad2b05-022b-4208-ba4a-5f5f5b69a15d	samuel.kiptoo@gmail.com	Samuel	Kiptoo	tenant	+254767890145	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
806d2ab4-a5c1-42d5-8874-cc44e4b6e1b5	esther.mutua@yahoo.com	Esther	Mutua	tenant	+254778901256	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
15302aa5-89fe-4ff1-84db-b055fd155c2d	michael.kioko@gmail.com	Michael	Kioko	tenant	+254789012367	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
3c462235-e652-463f-a89a-ffcf6693569a	agnes.mbatha@gmail.com	Agnes	Mbatha	tenant	+254790123478	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
83741b91-f18a-411b-b993-eef50a38d970	francis.musyoka@hotmail.com	Francis	Musyoka	tenant	+254701234589	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
f98b474d-a274-4bba-941d-65b8b5ae8168	janet.nyaboke@gmail.com	Janet	Nyaboke	tenant	+254712345690	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
98fb0362-125c-47fc-93d7-b177dcd51c2b	george.omogia@yahoo.com	George	Omogia	tenant	+254723456801	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
a6fe3838-2cff-4185-ac1c-3c3f09126084	lucy.kemunto@gmail.com	Lucy	Kemunto	tenant	+254734567912	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
5e204c48-eb86-42df-91c3-10379699158c	james.ondieki@gmail.com	James	Ondieki	tenant	+254745678123	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
f3b918f6-c910-4dbd-b6e8-b4354619e7ad	mary.kagendo@hotmail.com	Mary	Kagendo	tenant	+254756789234	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
edb4b262-a830-442a-8feb-b7791e41379c	david.murithi@gmail.com	David	Murithi	tenant	+254767890345	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
d58527ad-7406-4057-8866-527ce02a64f9	ruth.kawira@yahoo.com	Ruth	Kawira	tenant	+254778901456	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
2c504ad5-39f5-4414-8c3e-5803df1ca72e	anthony.mwenda@gmail.com	Anthony	Mwenda	tenant	+254789012567	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
a67fe9af-01d8-4ef4-9739-1ed4b1cd0319	hassan.mohamed@gmail.com	Hassan	Mohamed	tenant	+254790123678	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
d74389bf-fd5d-40f6-a32d-c2bb1cebcb85	fatuma.ali@hotmail.com	Fatuma	Ali	tenant	+254701234789	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
b53fda9e-3a6a-414c-a441-26e2ddc3fc28	catherine.wanjala@gmail.com	Catherine	Wanjala	tenant	+254712345801	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
b3b24647-2715-4566-95d2-dbd9cf86a0b8	robert.kimani@yahoo.com	Robert	Kimani	tenant	+254723456912	t	2025-08-27 15:52:20.318571	2025-08-27 15:52:20.318571	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
007468de-0ba0-4014-953a-0b0e2ebe091e	geltechke@gmail.com	Agini	Andisi	tenant	\N	t	2025-08-27 15:01:19.738891	2025-08-27 16:00:03.454	44061691	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
81fbbaab-2b80-45d0-bf53-ad6be7e7905f	admin@rentflow.com	System	Administrator	super_admin	\N	t	2025-08-27 17:02:02.480169	2025-08-27 17:02:02.480169	\N	admin	$2b$12$q3/YvrYZ4gYrw5jIVS7DtO0IDDOijQo0HqrptDOcQw2I2KNOpszJq	t	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
45896acc-cc79-447d-b79d-dab1e9907932	landlord@rentflow.com	John	Landlord	landlord	\N	t	2025-08-27 17:02:02.53574	2025-08-27 17:02:02.53574	\N	landlord	$2b$12$q3/YvrYZ4gYrw5jIVS7DtO0IDDOijQo0HqrptDOcQw2I2KNOpszJq	t	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
1de7a8b7-41cb-4234-ba4f-d38c8d58601e	agent@rentflow.com	Jane	Agent	agent	\N	t	2025-08-27 17:02:02.575445	2025-08-27 17:02:02.575445	\N	agent	$2b$12$q3/YvrYZ4gYrw5jIVS7DtO0IDDOijQo0HqrptDOcQw2I2KNOpszJq	t	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
c61fa9cd-9e96-466d-938f-ca34b590f36d	tenant@rentflow.com	Bob	Tenant	tenant	\N	t	2025-08-27 17:02:02.613682	2025-08-27 17:02:02.613682	\N	tenant	$2b$12$q3/YvrYZ4gYrw5jIVS7DtO0IDDOijQo0HqrptDOcQw2I2KNOpszJq	t	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
15daa318-db51-49a5-877e-42ecbfacce5b	test123@school.com	Kwame	Academy	tenant	2345675	t	2025-08-27 20:00:50.848663	2025-08-27 20:00:50.848663	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
e760dc1e-a92b-4aac-9b17-7e06c4443f02	jane.smith.test@example.com	Jane	Smith	tenant	+254700987654	t	2025-08-28 12:13:27.462094	2025-08-28 12:13:27.462094	\N	\N	\N	f	\N	\N	87654321	\N	\N	\N	\N	f	\N	\N
d593f8db-085b-4830-9f4a-498c3b5ede78	hiyuo@hmcoo.com	Pope	John	tenant	\N	t	2025-08-28 12:33:15.791029	2025-08-28 12:33:15.791029	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
a41b5c13-68df-4a63-9e4f-b8bfbc4902e5	test.unique@example.com	Test	User	tenant	\N	t	2025-08-28 12:35:09.76663	2025-08-28 12:35:09.76663	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
18457e5d-60b0-4583-81cf-a21e28156417	john.unique.test@example.com	John	Doe	tenant	\N	t	2025-08-28 12:36:28.069335	2025-08-28 12:36:28.069335	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
a81e6af1-1b4a-4185-945c-85e57e7382a1	jane.unique.test2@example.com	Jane	Smith	tenant	\N	t	2025-08-28 12:36:41.717083	2025-08-28 12:36:41.717083	\N	\N	\N	f	\N	\N	\N	\N	\N	John Smith	+254722123456	f	\N	\N
7b390d41-a8f1-41c8-ab26-4904f101bf4c	testphone@example.com	Test	Phone	tenant	\N	t	2025-08-28 12:36:52.474353	2025-08-28 12:36:52.474353	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
227c48bd-7be1-4583-92fe-9e0066c80671	nkrumah@gmail.com	PETER	NKRUMAH	tenant	57687	t	2025-08-28 14:15:25.776175	2025-08-28 14:15:25.776175	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
0e434f88-0240-42c1-8546-bbe1f709148d	alice.test.unique@example.com	Alice	Johnson	tenant	+254711234567	t	2025-08-28 14:49:18.720615	2025-08-28 14:49:18.720615	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 38, true);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: leases leases_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_pkey PRIMARY KEY (id);


--
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: property_recurring_fees property_recurring_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.property_recurring_fees
    ADD CONSTRAINT property_recurring_fees_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_version_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_version_key UNIQUE (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: tenant_deposits tenant_deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_deposits
    ADD CONSTRAINT tenant_deposits_pkey PRIMARY KEY (id);


--
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- Name: tenant_gadgets tenant_gadgets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_gadgets
    ADD CONSTRAINT tenant_gadgets_pkey PRIMARY KEY (id);


--
-- Name: unit_recurring_fees unit_recurring_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.unit_recurring_fees
    ADD CONSTRAINT unit_recurring_fees_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: user_access_requests user_access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_access_requests
    ADD CONSTRAINT user_access_requests_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_replit_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_replit_id_key UNIQUE (replit_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_audit_logs_table; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_logs_table ON public.audit_logs USING btree (table_name, operation, "timestamp" DESC);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id, "timestamp" DESC);


--
-- Name: idx_leases_occupancy_report; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_leases_occupancy_report ON public.leases USING btree (unit_id, status, start_date, end_date) WHERE (status = 'active'::public.lease_status);


--
-- Name: idx_payments_monthly_reports; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payments_monthly_reports ON public.payments USING btree (date_trunc('month'::text, payment_date), status, payment_method);


--
-- Name: idx_payments_revenue_analytics; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payments_revenue_analytics ON public.payments USING btree (payment_date, status, amount) WHERE (status = ANY (ARRAY['paid'::public.payment_status, 'pending'::public.payment_status]));


--
-- Name: idx_properties_fulltext; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_properties_fulltext ON public.properties USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || description)));


--
-- Name: idx_schema_migrations_applied_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_schema_migrations_applied_at ON public.schema_migrations USING btree (applied_at);


--
-- Name: idx_schema_migrations_version; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_schema_migrations_version ON public.schema_migrations USING btree (version);


--
-- Name: idx_units_available; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_units_available ON public.units USING btree (property_id, monthly_rent, bedrooms) WHERE (status = 'vacant'::public.unit_status);


--
-- Name: idx_units_with_rent; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_units_with_rent ON public.units USING btree (property_id, status) INCLUDE (unit_number, monthly_rent, bedrooms, bathrooms);


--
-- Name: idx_users_fulltext; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_fulltext ON public.users USING gin (to_tsvector('english'::regconfig, (((((first_name)::text || ' '::text) || (last_name)::text) || ' '::text) || (COALESCE(email, ''::character varying))::text)));


--
-- Name: idx_users_tenant_lookup; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_tenant_lookup ON public.users USING btree (role, is_active, is_approved) WHERE (role = 'tenant'::public.user_role);


--
-- Name: leases leases_audit_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER leases_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: maintenance_requests maintenance_requests_audit_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER maintenance_requests_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: payments payments_audit_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER payments_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: properties properties_audit_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER properties_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: tenant_deposits tenant_deposits_audit_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER tenant_deposits_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.tenant_deposits FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: tenant_documents tenant_documents_audit_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER tenant_documents_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.tenant_documents FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: units units_audit_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER units_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: users users_audit_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER users_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: invoices invoices_tenant_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_tenant_id_users_id_fk FOREIGN KEY (tenant_id) REFERENCES public.users(id);


--
-- Name: invoices invoices_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: leases leases_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: leases leases_tenant_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_tenant_id_users_id_fk FOREIGN KEY (tenant_id) REFERENCES public.users(id);


--
-- Name: leases leases_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: maintenance_requests maintenance_requests_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: maintenance_requests maintenance_requests_tenant_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_tenant_id_users_id_fk FOREIGN KEY (tenant_id) REFERENCES public.users(id);


--
-- Name: maintenance_requests maintenance_requests_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: payments payments_lease_id_leases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_lease_id_leases_id_fk FOREIGN KEY (lease_id) REFERENCES public.leases(id);


--
-- Name: payments payments_tenant_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tenant_id_users_id_fk FOREIGN KEY (tenant_id) REFERENCES public.users(id);


--
-- Name: payments payments_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: properties properties_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: properties properties_manager_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_manager_id_users_id_fk FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: properties properties_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: property_recurring_fees property_recurring_fees_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.property_recurring_fees
    ADD CONSTRAINT property_recurring_fees_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: tenant_deposits tenant_deposits_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_deposits
    ADD CONSTRAINT tenant_deposits_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id);


--
-- Name: tenant_deposits tenant_deposits_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_deposits
    ADD CONSTRAINT tenant_deposits_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(id);


--
-- Name: tenant_documents tenant_documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_documents
    ADD CONSTRAINT tenant_documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(id);


--
-- Name: tenant_documents tenant_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_documents
    ADD CONSTRAINT tenant_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: tenant_gadgets tenant_gadgets_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_gadgets
    ADD CONSTRAINT tenant_gadgets_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id);


--
-- Name: tenant_gadgets tenant_gadgets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_gadgets
    ADD CONSTRAINT tenant_gadgets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(id);


--
-- Name: unit_recurring_fees unit_recurring_fees_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.unit_recurring_fees
    ADD CONSTRAINT unit_recurring_fees_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: units units_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: units units_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: user_access_requests user_access_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_access_requests
    ADD CONSTRAINT user_access_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: users users_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: users users_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: tenant_documents documents_owner_access; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY documents_owner_access ON public.tenant_documents USING (((tenant_id = (current_setting('app.current_user_id'::text))::uuid) OR (current_setting('app.user_role'::text) = ANY (ARRAY['super_admin'::text, 'landlord'::text, 'property_manager'::text]))));


--
-- Name: leases; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

--
-- Name: leases leases_management_access; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY leases_management_access ON public.leases USING ((current_setting('app.user_role'::text) = ANY (ARRAY['super_admin'::text, 'landlord'::text, 'property_manager'::text, 'agent'::text])));


--
-- Name: leases leases_tenant_access; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY leases_tenant_access ON public.leases USING ((tenant_id = (current_setting('app.current_user_id'::text))::uuid));


--
-- Name: maintenance_requests; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: maintenance_requests maintenance_staff_access; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY maintenance_staff_access ON public.maintenance_requests USING (((current_setting('app.user_role'::text) = ANY (ARRAY['super_admin'::text, 'landlord'::text, 'property_manager'::text, 'agent'::text])) OR (assigned_to = (current_setting('app.current_user_id'::text))::uuid)));


--
-- Name: maintenance_requests maintenance_tenant_access; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY maintenance_tenant_access ON public.maintenance_requests USING ((tenant_id = (current_setting('app.current_user_id'::text))::uuid));


--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments_landlord_access; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY payments_landlord_access ON public.payments USING ((current_setting('app.user_role'::text) = ANY (ARRAY['super_admin'::text, 'landlord'::text, 'property_manager'::text])));


--
-- Name: payments payments_tenant_access; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY payments_tenant_access ON public.payments USING ((tenant_id = (current_setting('app.current_user_id'::text))::uuid));


--
-- Name: tenant_deposits; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.tenant_deposits ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_documents; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_own_data; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY users_own_data ON public.users USING (((id = (current_setting('app.current_user_id'::text))::uuid) OR (current_setting('app.user_role'::text) = ANY (ARRAY['super_admin'::text, 'landlord'::text]))));


--
-- Name: users users_view_tenants; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY users_view_tenants ON public.users FOR SELECT USING (((role = 'tenant'::public.user_role) AND (current_setting('app.user_role'::text) = ANY (ARRAY['landlord'::text, 'property_manager'::text, 'agent'::text]))));


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

