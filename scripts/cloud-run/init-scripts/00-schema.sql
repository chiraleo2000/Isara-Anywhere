--
-- PostgreSQL database dump
--

\restrict hXjl6gYCMaXouLjUtt8sVN63vUe7gwctSurqnxxPczBb606DwlTxHdIVdpidZ7D

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg12+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg12+1)

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_chat_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_chat_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying(50),
    session_id character varying(50),
    role character varying(20) NOT NULL,
    content text NOT NULL,
    context jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ai_document_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_document_analysis (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying(50),
    patient_id character varying(50),
    document_type character varying(50),
    original_filename character varying(255),
    file_url text,
    ai_summary text,
    key_findings jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id character varying(50) NOT NULL,
    patient_id character varying(50),
    doctor_id character varying(50),
    requested_date date,
    requested_time time without time zone,
    confirmed_date date,
    confirmed_time time without time zone,
    appointment_type character varying(50) DEFAULT 'Telehealth'::character varying,
    status character varying(50) DEFAULT 'pending'::character varying,
    urgency_level character varying(20) DEFAULT 'normal'::character varying,
    symptoms jsonb DEFAULT '[]'::jsonb,
    symptom_description text,
    ai_triage jsonb,
    notes text,
    meet_link text,
    jitsi_room_name character varying(255),
    invitees jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    confirmed_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id character varying(50) NOT NULL,
    user_id character varying(50),
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id character varying(50),
    details jsonb,
    old_value jsonb,
    new_value jsonb,
    ip_address character varying(45),
    user_agent text,
    performed_by character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cds_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cds_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    doctor_id character varying(50),
    patient_id character varying(50),
    appointment_id character varying(50),
    cds_type character varying(50),
    recommendation text,
    guidelines_referenced jsonb,
    doctor_decision character varying(20),
    doctor_notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clinical_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_resources (
    id character varying(50) NOT NULL,
    title_thai character varying(500) NOT NULL,
    title_english character varying(500),
    content_thai text NOT NULL,
    content_english text,
    category character varying(100),
    specialty character varying(100),
    guideline_year integer,
    source character varying(255),
    tags jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    approved_by character varying(50),
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: consultants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultants (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    specialty character varying(100) NOT NULL,
    email character varying(255),
    phone character varying(50),
    hospital character varying(255),
    languages jsonb,
    experience_years integer,
    bio text,
    is_available boolean DEFAULT true,
    rating numeric(2,1),
    reviews jsonb DEFAULT '[]'::jsonb,
    admin_notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: doctor_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_profiles (
    doctor_id character varying(50) NOT NULL,
    specialty character varying(100),
    sub_specialties jsonb,
    qualifications text,
    experience_years integer,
    hospital_name character varying(255),
    department character varying(100),
    languages jsonb DEFAULT '["Thai", "English"]'::jsonb,
    rating numeric(2,1),
    total_reviews integer DEFAULT 0,
    consultation_fee numeric(10,2),
    is_available boolean DEFAULT true,
    schedule jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: drugs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drugs (
    id character varying(50) NOT NULL,
    generic_name character varying(255) NOT NULL,
    brand_names jsonb,
    drug_class character varying(100),
    dosage_forms jsonb,
    indications jsonb,
    contraindications jsonb,
    interactions jsonb,
    side_effects jsonb,
    pregnancy_category character varying(5),
    renal_adjustment jsonb,
    hepatic_adjustment jsonb
);


--
-- Name: emr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emr (
    id character varying(50) NOT NULL,
    appointment_id character varying(50),
    patient_id character varying(50),
    doctor_id character varying(50),
    subjective jsonb,
    objective jsonb,
    assessment jsonb,
    plan jsonb,
    ai_summary text,
    ai_summary_approved boolean DEFAULT false,
    ai_summary_approved_at timestamp with time zone,
    patient_instructions text,
    patient_instructions_thai text,
    doctor_signature text,
    signed_at timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: icd10_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.icd10_codes (
    code character varying(10) NOT NULL,
    description_english character varying(500),
    description_thai character varying(500),
    category character varying(100),
    chapter character varying(10)
);


--
-- Name: knowledge_base; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_base (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    content text NOT NULL,
    content_type character varying(50),
    source character varying(255),
    embedding public.vector(768),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: lab_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_orders (
    id character varying(50) NOT NULL,
    emr_id character varying(50),
    appointment_id character varying(50),
    patient_id character varying(50),
    doctor_id character varying(50),
    tests jsonb NOT NULL,
    priority character varying(20) DEFAULT 'routine'::character varying,
    lab_name character varying(255),
    results jsonb,
    ai_analysis text,
    status character varying(20) DEFAULT 'ordered'::character varying,
    ordered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone
);


--
-- Name: living_wills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.living_wills (
    id character varying(50) NOT NULL,
    patient_id character varying(50),
    statement text,
    treatments jsonb,
    representatives jsonb,
    signature jsonb,
    pdpa_consent jsonb,
    status character varying(20) DEFAULT 'active'::character varying,
    signed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    audit_log jsonb DEFAULT '[]'::jsonb
);


--
-- Name: medical_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_content (
    id character varying(50) NOT NULL,
    title_thai character varying(500) NOT NULL,
    title_english character varying(500),
    content_thai text NOT NULL,
    content_english text,
    category character varying(100),
    tags jsonb,
    author_id character varying(50),
    status character varying(20) DEFAULT 'draft'::character varying,
    published_at timestamp with time zone,
    view_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: meeting_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    appointment_id character varying(50),
    doctor_id character varying(50),
    patient_id character varying(50),
    recording_url text,
    transcript text,
    ai_summary text,
    ai_recommendations text,
    section_summaries jsonb,
    duration_minutes integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying(50),
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    title_thai character varying(255),
    message text,
    message_thai text,
    data jsonb,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: patient_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_profiles (
    patient_id character varying(50) NOT NULL,
    demographics jsonb NOT NULL,
    emergency_contact jsonb,
    insurance_info jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: phr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phr (
    id character varying(50) NOT NULL,
    patient_id character varying(50),
    demographics jsonb,
    vital_signs_history jsonb DEFAULT '[]'::jsonb,
    allergies jsonb DEFAULT '[]'::jsonb,
    chronic_conditions jsonb DEFAULT '[]'::jsonb,
    medications jsonb DEFAULT '[]'::jsonb,
    vaccinations jsonb DEFAULT '[]'::jsonb,
    lifestyle jsonb,
    family_history jsonb DEFAULT '[]'::jsonb,
    surgical_history jsonb DEFAULT '[]'::jsonb,
    social_history jsonb,
    latest_lab_results jsonb DEFAULT '[]'::jsonb,
    clinical_decision_support jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_synced_at timestamp with time zone
);


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescriptions (
    id character varying(50) NOT NULL,
    emr_id character varying(50),
    appointment_id character varying(50),
    patient_id character varying(50),
    doctor_id character varying(50),
    medications jsonb NOT NULL,
    pharmacy_instructions text,
    cds_warnings jsonb,
    cds_approved boolean DEFAULT false,
    status character varying(20) DEFAULT 'pending'::character varying,
    dispensed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(128) NOT NULL,
    user_id character varying(50),
    token text NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL,
    logged_out_at timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    name_thai character varying(255),
    avatar_url text,
    phone character varying(50),
    date_of_birth date,
    gender character varying(20),
    national_id character varying(20),
    doctor_id character varying(50),
    medical_license_number character varying(50),
    specialty character varying(100),
    hospital_name character varying(255),
    patient_id character varying(50),
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    is_approved boolean DEFAULT false,
    approval_status character varying(20) DEFAULT 'pending'::character varying,
    admin_privileges jsonb,
    is_admin boolean DEFAULT false,
    preferences jsonb DEFAULT '{"theme": "light", "language": "th", "notifications": true}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp with time zone,
    login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['doctor'::character varying, 'admin'::character varying, 'patient'::character varying])::text[])))
);


--
-- Name: v_active_appointments; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_active_appointments AS
 SELECT a.id,
    a.patient_id,
    a.doctor_id,
    a.requested_date,
    a.requested_time,
    a.confirmed_date,
    a.confirmed_time,
    a.appointment_type,
    a.status,
    a.urgency_level,
    a.symptoms,
    a.symptom_description,
    a.ai_triage,
    a.notes,
    a.meet_link,
    a.jitsi_room_name,
    a.invitees,
    a.created_at,
    a.updated_at,
    a.confirmed_at,
    a.completed_at,
    a.cancelled_at,
    a.cancellation_reason,
    p.name AS patient_name,
    p.name_thai AS patient_name_thai,
    d.name AS doctor_name,
    d.name_thai AS doctor_name_thai,
    d.specialty AS doctor_specialty
   FROM ((public.appointments a
     LEFT JOIN public.users p ON (((a.patient_id)::text = (p.id)::text)))
     LEFT JOIN public.users d ON (((a.doctor_id)::text = (d.id)::text)))
  WHERE ((a.status)::text <> ALL ((ARRAY['completed'::character varying, 'cancelled'::character varying])::text[]));


--
-- Name: v_patient_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_patient_summary AS
 SELECT u.id,
    u.name,
    u.name_thai,
    u.email,
    phr.demographics,
    phr.allergies,
    phr.chronic_conditions,
    phr.medications,
    phr.clinical_decision_support
   FROM (public.users u
     LEFT JOIN public.phr ON (((u.id)::text = (phr.patient_id)::text)))
  WHERE ((u.role)::text = 'patient'::text);


--
-- Name: vital_signs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vital_signs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    patient_id character varying(50),
    blood_pressure_systolic integer,
    blood_pressure_diastolic integer,
    heart_rate integer,
    temperature numeric(4,1),
    respiratory_rate integer,
    oxygen_saturation integer,
    blood_glucose integer,
    blood_glucose_type character varying(20),
    weight numeric(5,1),
    height numeric(5,1),
    bmi numeric(4,1),
    measured_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    source character varying(20) DEFAULT 'patient_input'::character varying,
    notes text
);


--
-- Data for Name: ai_chat_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_chat_history (id, user_id, session_id, role, content, context, created_at) FROM stdin;
\.


--
-- Data for Name: ai_document_analysis; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_document_analysis (id, user_id, patient_id, document_type, original_filename, file_url, ai_summary, key_findings, created_at) FROM stdin;
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointments (id, patient_id, doctor_id, requested_date, requested_time, confirmed_date, confirmed_time, appointment_type, status, urgency_level, symptoms, symptom_description, ai_triage, notes, meet_link, jitsi_room_name, invitees, created_at, updated_at, confirmed_at, completed_at, cancelled_at, cancellation_reason) FROM stdin;
APT-DEMO-001	PATIENT-DEMO	DOC-TEST-001	2026-01-22	10:00:00	2026-01-22	10:00:00	Telehealth	confirmed	normal	[]	General checkup	\N	First visit for general health assessment	https://meet.jit.si/izara-apt-demo-001	izara-apt-demo-001	[]	2026-01-20 08:51:38.053008+00	2026-01-20 08:51:38.053008+00	\N	\N	\N	\N
APT-SOMCHAI-001	PATIENT-SOMCHAI	DOC-TEST-001	2026-01-23	14:00:00	2026-01-23	14:00:00	Telehealth	confirmed	normal	[]	Blood pressure follow-up	\N	Regular hypertension monitoring	https://meet.jit.si/izara-apt-somchai-001	izara-apt-somchai-001	[]	2026-01-20 08:51:38.053008+00	2026-01-20 08:51:38.053008+00	\N	\N	\N	\N
APT-ANAN-001	PATIENT-ANAN	DOC-UNIT-001	2026-01-24	09:00:00	\N	\N	Telehealth	pending	normal	[]	Diabetes management	\N	DM + CKD medication review	\N	\N	[]	2026-01-20 08:51:38.053008+00	2026-01-20 08:51:38.053008+00	\N	\N	\N	\N
APT-SOMCHAI-PAST1	PATIENT-SOMCHAI	DOC-TEST-001	2026-01-13	10:00:00	2026-01-13	10:00:00	Telehealth	completed	normal	[]	Hypertension consultation	\N	Patient had elevated BP	https://meet.jit.si/izara-apt-past-somchai	izara-apt-past-somchai	[]	2026-01-13 08:51:38.053008+00	2026-01-20 08:51:38.053008+00	\N	\N	\N	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, action, entity_type, entity_id, details, old_value, new_value, ip_address, user_agent, performed_by, created_at) FROM stdin;
\.


--
-- Data for Name: cds_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cds_logs (id, doctor_id, patient_id, appointment_id, cds_type, recommendation, guidelines_referenced, doctor_decision, doctor_notes, created_at) FROM stdin;
\.


--
-- Data for Name: clinical_resources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinical_resources (id, title_thai, title_english, content_thai, content_english, category, specialty, guideline_year, source, tags, status, approved_by, approved_at, created_at, updated_at) FROM stdin;
CR-HTN-001	α╣üα╕Öα╕ºα╕ùα╕▓α╕çα╕üα╕▓α╕úα╕úα╕▒α╕üα╕⌐α╕▓α╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╣éα╕Ñα╕½α╕┤α╕òα╕¬α╕╣α╕ç JNC 8	JNC 8 Hypertension Treatment Guidelines	# α╕¬α╕úα╕╕α╕¢α╣üα╕Öα╕ºα╕ùα╕▓α╕ç JNC 8\r\n\r\n## α╣Çα╕¢α╣ëα╕▓α╕½α╕íα╕▓α╕óα╕üα╕▓α╕úα╕úα╕▒α╕üα╕⌐α╕▓\r\n| α╕üα╕Ñα╕╕α╣êα╕í | SBP | DBP |\r\n|-------|-----|-----|\r\n| α╕¡α╕▓α╕óα╕╕ ΓëÑ60 | <150 | <90 |\r\n| α╕¡α╕▓α╕óα╕╕ <60 | <140 | <90 |\r\n| α╣Çα╕Üα╕▓α╕½α╕ºα╕▓α╕Ö | <140 | <90 |\r\n| CKD | <140 | <90 |\r\n\r\n## α╕óα╕▓α╕Ñα╕│α╕öα╕▒α╕Üα╣üα╕úα╕ü\r\n1. α╕óα╕▓α╕éα╕▒α╕Üα╕¢α╕▒α╕¬α╕¬α╕▓α╕ºα╕░ Thiazide\r\n2. ACE inhibitors\r\n3. ARBs\r\n4. Calcium channel blockers	# JNC 8 Hypertension Guidelines Summary\r\n\r\n## Treatment Thresholds\r\n| Population | SBP Goal | DBP Goal |\r\n|------------|----------|----------|\r\n| Age ΓëÑ60 | <150 | <90 |\r\n| Age <60 | <140 | <90 |\r\n| Diabetes | <140 | <90 |\r\n| CKD | <140 | <90 |\r\n\r\n## First-Line Medications\r\n1. **Thiazide diuretics** - HCTZ, Chlorthalidone\r\n2. **ACE inhibitors** - Enalapril, Lisinopril\r\n3. **ARBs** - Losartan, Valsartan\r\n4. **CCBs** - Amlodipine, Felodipine\r\n\r\n## Special Populations\r\n- **Black patients**: Thiazide or CCB preferred\r\n- **CKD with proteinuria**: ACEi or ARB required\r\n- **Pregnancy**: Labetalol, Nifedipine, Methyldopa	cardiology	Cardiology	2024	Thai Hypertension Society	["hypertension", "guidelines", "cardiology"]	published	ADMIN-001	2025-11-26 08:51:38.064466+00	2025-11-21 08:51:38.064466+00	2026-01-20 08:51:38.064466+00
CR-DM-001	α╣üα╕Öα╕ºα╕ùα╕▓α╕çα╕üα╕▓α╕úα╕úα╕▒α╕üα╕⌐α╕▓α╣Çα╕Üα╕▓α╕½α╕ºα╕▓α╕Öα╕èα╕Öα╕┤α╕öα╕ùα╕╡α╣ê 2	Type 2 Diabetes Treatment Algorithm	# α╣üα╕Öα╕ºα╕ùα╕▓α╕çα╕üα╕▓α╕úα╕úα╕▒α╕üα╕⌐α╕▓α╣Çα╕Üα╕▓α╕½α╕ºα╕▓α╕Öα╕èα╕Öα╕┤α╕öα╕ùα╕╡α╣ê 2\r\n\r\n## α╕üα╕▓α╕úα╕¢α╕úα╕░α╣Çα╕íα╕┤α╕Öα╣Çα╕Üα╕╖α╣ëα╕¡α╕çα╕òα╣ëα╕Ö\r\n- HbA1c\r\n- α╕Öα╣ëα╕│α╕òα╕▓α╕Ñα╕éα╕ôα╕░α╕¡α╕öα╕¡α╕▓α╕½α╕▓α╕ú\r\n- α╕üα╕▓α╕úα╕ùα╕│α╕çα╕▓α╕Öα╕éα╕¡α╕çα╣äα╕ò\r\n- α╕äα╕ºα╕▓α╕íα╣Çα╕¬α╕╡α╣êα╕óα╕çα╕½α╕Ñα╕¡α╕öα╣Çα╕Ñα╕╖α╕¡α╕öα╕½α╕▒α╕ºα╣âα╕ê\r\n\r\n## α╕éα╕▒α╣ëα╕Öα╕òα╕¡α╕Öα╕üα╕▓α╕úα╕úα╕▒α╕üα╕⌐α╕▓\r\n### α╕éα╕▒α╣ëα╕Öα╕ùα╕╡α╣ê 1: α╕¢α╕úα╕▒α╕Üα╕₧α╕ñα╕òα╕┤α╕üα╕úα╕úα╕í + Metformin\r\n### α╕éα╕▒α╣ëα╕Öα╕ùα╕╡α╣ê 2: α╣Çα╕₧α╕┤α╣êα╕íα╕óα╕▓α╕òα╕▒α╕ºα╕ùα╕╡α╣ê 2\r\n### α╕éα╕▒α╣ëα╕Öα╕ùα╕╡α╣ê 3: α╕óα╕▓ 3 α╕òα╕▒α╕º\r\n### α╕éα╕▒α╣ëα╕Öα╕ùα╕╡α╣ê 4: α╕óα╕▓α╕ëα╕╡α╕ö	# Type 2 Diabetes Treatment Algorithm\r\n\r\n## Initial Assessment\r\n- HbA1c measurement\r\n- Fasting glucose\r\n- Renal function (eGFR, urine ACR)\r\n- Cardiovascular risk assessment\r\n\r\n## Treatment Steps\r\n\r\n### Step 1: Lifestyle + Metformin\r\n- Diet and exercise counseling\r\n- Metformin 500mg ΓåÆ 2000mg/day\r\n\r\n### Step 2: Add Second Agent (if A1c >7%)\r\n- SGLT2 inhibitor (if CKD/CVD)\r\n- GLP-1 RA (if weight management needed)\r\n- DPP-4 inhibitor (if cost concern)\r\n\r\n### Step 3: Triple Therapy\r\n- Add third agent from different class\r\n\r\n### Step 4: Injectable Therapy\r\n- Basal insulin\r\n- GLP-1 RA if not already on it	endocrinology	Endocrinology	2024	Thai Diabetes Association	["diabetes", "protocol", "endocrinology"]	published	ADMIN-001	2025-12-01 08:51:38.064466+00	2025-11-26 08:51:38.064466+00	2026-01-20 08:51:38.064466+00
CR-ABX-001	α╣üα╕Öα╕ºα╕ùα╕▓α╕çα╕üα╕▓α╕úα╕¬α╕▒α╣êα╕çα╕óα╕▓α╕¢α╕Åα╕┤α╕èα╕╡α╕ºα╕Öα╕░	Antibiotic Prescribing Guidelines	# α╣üα╕Öα╕ºα╕ùα╕▓α╕çα╕üα╕▓α╕úα╕¬α╕▒α╣êα╕çα╕óα╕▓α╕¢α╕Åα╕┤α╕èα╕╡α╕ºα╕Öα╕░\r\n\r\n## α╕üα╕▓α╕úα╕òα╕┤α╕öα╣Çα╕èα╕╖α╣ëα╕¡α╕ùα╕▓α╕çα╣Çα╕öα╕┤α╕Öα╕½α╕▓α╕óα╣âα╕ê\r\n\r\n### α╕¢α╕¡α╕öα╕¡α╕▒α╕üα╣Çα╕¬α╕Üα╣âα╕Öα╕èα╕╕α╕íα╕èα╕Ö\r\n- Amoxicillin 500mg α╕ºα╕▒α╕Öα╕Ñα╕░ 3 α╕äα╕úα╕▒α╣ëα╕ç x 5 α╕ºα╕▒α╕Ö\r\n- α╣üα╕₧α╣ë Penicillin: Azithromycin\r\n\r\n## α╕üα╕▓α╕úα╕òα╕┤α╕öα╣Çα╕èα╕╖α╣ëα╕¡α╕ùα╕▓α╕çα╣Çα╕öα╕┤α╕Öα╕¢α╕▒α╕¬α╕¬α╕▓α╕ºα╕░\r\n\r\n### α╕üα╕úα╕░α╣Çα╕₧α╕▓α╕░α╕¢α╕▒α╕¬α╕¬α╕▓α╕ºα╕░α╕¡α╕▒α╕üα╣Çα╕¬α╕Ü (α╣äα╕íα╣êα╕ïα╕▒α╕Üα╕ïα╣ëα╕¡α╕Ö)\r\n- Nitrofurantoin 100mg α╕ºα╕▒α╕Öα╕Ñα╕░ 2 α╕äα╕úα╕▒α╣ëα╕ç x 5 α╕ºα╕▒α╕Ö	# Antibiotic Prescribing Guidelines\r\n\r\n## Respiratory Infections\r\n\r\n### Community-Acquired Pneumonia (Outpatient)\r\n- **First-line**: Amoxicillin 500mg TID x 5 days\r\n- **Penicillin allergy**: Azithromycin 500mg day 1, then 250mg x 4 days\r\n\r\n### Acute Sinusitis\r\n- **Watchful waiting** x 10 days first\r\n- **If antibiotics needed**: Amoxicillin 500mg TID x 5-7 days\r\n\r\n## Urinary Tract Infections\r\n\r\n### Uncomplicated Cystitis (Women)\r\n- Nitrofurantoin 100mg BID x 5 days\r\n- TMP-SMX DS BID x 3 days (if susceptible)	infectious-disease	Infectious Disease	2024	Thai Medical Association	["antibiotics", "infectious-disease", "prescribing"]	published	ADMIN-001	2025-12-06 08:51:38.064466+00	2025-12-01 08:51:38.064466+00	2026-01-20 08:51:38.064466+00
\.


--
-- Data for Name: consultants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consultants (id, name, specialty, email, phone, hospital, languages, experience_years, bio, is_available, rating, reviews, admin_notes, created_at, updated_at) FROM stdin;
CONS-001	Dr. Wanida Heartcare	Cardiology	wanida.cardio@hospital.com	+66821234567	Siriraj Hospital	["Thai", "English"]	15	Experienced cardiologist specializing in interventional cardiology and heart failure management. Board certified in cardiovascular medicine.	t	4.9	[{"date": "2024-01-15", "rating": 5, "comment": "Excellent care and explanation", "patient": "Anonymous"}]	Top-rated consultant, high patient satisfaction	2026-01-20 08:51:38.070792+00	2026-01-20 08:51:38.070792+00
CONS-002	Dr. Prasert Kidney	Nephrology	prasert.nephro@hospital.com	+66832345678	Ramathibodi Hospital	["Thai", "English"]	12	Nephrology specialist with expertise in chronic kidney disease, dialysis management, and kidney transplant evaluation.	t	4.8	[{"date": "2024-02-10", "rating": 5, "comment": "Very thorough and caring", "patient": "Anonymous"}]	Excellent CKD management skills	2026-01-20 08:51:38.070792+00	2026-01-20 08:51:38.070792+00
CONS-003	Dr. Somchai Bones	Orthopedics	somchai.ortho@hospital.com	+66843456789	Chulalongkorn Hospital	["Thai", "English", "Chinese"]	20	Senior orthopedic surgeon specializing in joint replacement, sports medicine, and minimally invasive procedures.	t	4.7	[{"date": "2024-01-25", "rating": 4, "comment": "Very skilled surgeon", "patient": "Anonymous"}]	Expert in joint replacement surgery	2026-01-20 08:51:38.070792+00	2026-01-20 08:51:38.070792+00
\.


--
-- Data for Name: doctor_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doctor_profiles (doctor_id, specialty, sub_specialties, qualifications, experience_years, hospital_name, department, languages, rating, total_reviews, consultation_fee, is_available, schedule, created_at, updated_at) FROM stdin;
DOC-TEST-001	General Practice	["Family Medicine", "Preventive Care", "Chronic Disease Management"]	M.D. Chulalongkorn University, Board Certified Family Medicine	15	Izara Virtual Hospital	General Medicine	["Thai", "English"]	4.8	0	500.00	t	{"friday": ["09:00-12:00", "13:00-17:00"], "monday": ["09:00-12:00", "13:00-17:00"], "tuesday": ["09:00-12:00", "13:00-17:00"], "thursday": ["09:00-12:00", "13:00-17:00"], "wednesday": ["09:00-12:00"]}	2026-01-20 08:51:38.044115+00	2026-01-20 08:51:38.044115+00
DOC-UNIT-001	Internal Medicine	["Cardiology", "Nephrology", "Diabetes Care"]	M.D. Mahidol University, Fellowship Internal Medicine	10	Izara Virtual Hospital	Internal Medicine	["Thai", "English"]	4.7	0	800.00	t	{"tuesday": ["09:00-16:00"], "saturday": ["09:00-12:00"], "thursday": ["09:00-16:00"]}	2026-01-20 08:51:38.044115+00	2026-01-20 08:51:38.044115+00
\.


--
-- Data for Name: drugs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.drugs (id, generic_name, brand_names, drug_class, dosage_forms, indications, contraindications, interactions, side_effects, pregnancy_category, renal_adjustment, hepatic_adjustment) FROM stdin;
\.


--
-- Data for Name: emr; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.emr (id, appointment_id, patient_id, doctor_id, subjective, objective, assessment, plan, ai_summary, ai_summary_approved, ai_summary_approved_at, patient_instructions, patient_instructions_thai, doctor_signature, signed_at, status, created_at, updated_at) FROM stdin;
EMR-SOMCHAI-001	APT-SOMCHAI-PAST1	PATIENT-SOMCHAI	DOC-TEST-001	{"chief_complaint": "α╕¢α╕ºα╕öα╕¿α╕╡α╕úα╕⌐α╕░ α╕íα╕╢α╕Öα╕çα╕ç α╕Öα╕¡α╕Öα╣äα╕íα╣êα╕½α╕Ñα╕▒α╕Ü", "chief_complaint_en": "Headache, dizziness, insomnia", "history_of_present_illness": "Patient reports persistent headaches for 3 days, worse in mornings. Associated dizziness when standing. Poor sleep quality."}	{"vital_signs": {"bp": "152/96", "hr": 82, "spo2": 98, "temp": 36.6}, "physical_exam": {"general": "Alert, oriented", "neurological": "No focal deficits", "cardiovascular": "Regular rhythm, no murmurs"}}	{"icd10_code": "I16.0", "primary_diagnosis": "Hypertensive urgency", "secondary_diagnoses": ["Tension headache", "Sleep disturbance"]}	{"follow_up": "2 weeks", "lifestyle": ["Reduce sodium intake", "Regular exercise"], "medications": [{"dose": "10mg", "name": "Amlodipine", "duration": "continue", "frequency": "once daily"}]}	Patient presents with hypertensive urgency (BP 152/96) with associated headache and dizziness. Continue Amlodipine 10mg, lifestyle modifications recommended. Follow-up in 2 weeks.	t	\N	Please take your blood pressure medication every morning. Reduce salt intake. Walk 30 minutes daily. Monitor BP at home and record readings.	α╕üα╕úα╕╕α╕ôα╕▓α╕úα╕▒α╕Üα╕¢α╕úα╕░α╕ùα╕▓α╕Öα╕óα╕▓α╕Ñα╕öα╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╕ùα╕╕α╕üα╣Çα╕èα╣ëα╕▓ α╕Ñα╕öα╕üα╕▓α╕úα╕Üα╕úα╕┤α╣éα╕áα╕äα╣Çα╕üα╕Ñα╕╖α╕¡ α╣Çα╕öα╕┤α╕Öα╕¡α╕¡α╕üα╕üα╕│α╕Ñα╕▒α╕çα╕üα╕▓α╕ó 30 α╕Öα╕▓α╕ùα╕╡α╕ùα╕╕α╕üα╕ºα╕▒α╕Ö α╕ºα╕▒α╕öα╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╕ùα╕╡α╣êα╕Üα╣ëα╕▓α╕Öα╣üα╕Ñα╕░α╕Üα╕▒α╕Öα╕ùα╕╢α╕üα╕äα╣êα╕▓	\N	\N	completed	2026-01-13 08:51:38.058353+00	2026-01-20 08:51:38.058353+00
\.


--
-- Data for Name: icd10_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.icd10_codes (code, description_english, description_thai, category, chapter) FROM stdin;
\.


--
-- Data for Name: knowledge_base; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.knowledge_base (id, content, content_type, source, embedding, metadata, created_at) FROM stdin;
ba5288e0-32e4-44bf-b856-d88d04a8cea1	Hypertension (HTN) is defined as systolic blood pressure ΓëÑ140 mmHg or diastolic blood pressure ΓëÑ90 mmHg. First-line treatment includes lifestyle modifications (DASH diet, exercise, sodium restriction) and medication with ACE inhibitors, ARBs, or calcium channel blockers. Target BP for most patients is <130/80 mmHg.	clinical_guideline	Thai Hypertension Society Guidelines 2024	\N	{"tags": ["blood pressure", "antihypertensive"], "category": "hypertension", "language": "en", "specialty": "cardiology"}	2026-01-20 08:46:27.47292+00
1e56b564-9587-40e4-8db3-d6f411b428e8	α╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╣éα╕Ñα╕½α╕┤α╕òα╕¬α╕╣α╕ç (Hypertension) α╕½α╕íα╕▓α╕óα╕ûα╕╢α╕ç α╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╕ïα╕┤α╕¬α╣éα╕òα╕Ñα╕┤α╕ü ΓëÑ140 mmHg α╕½α╕úα╕╖α╕¡α╣äα╕öα╣üα╕¡α╕¬α╣éα╕òα╕Ñα╕┤α╕ü ΓëÑ90 mmHg α╕üα╕▓α╕úα╕úα╕▒α╕üα╕⌐α╕▓α╣Çα╕úα╕┤α╣êα╕íα╕òα╣ëα╕Öα╕öα╣ëα╕ºα╕óα╕üα╕▓α╕úα╕¢α╕úα╕▒α╕Üα╕₧α╕ñα╕òα╕┤α╕üα╕úα╕úα╕í (α╕¡α╕▓α╕½α╕▓α╕ú DASH, α╕¡α╕¡α╕üα╕üα╕│α╕Ñα╕▒α╕çα╕üα╕▓α╕ó, α╕Ñα╕öα╣Çα╕üα╕Ñα╕╖α╕¡) α╣üα╕Ñα╕░α╕óα╕▓ ACE inhibitor, ARB α╕½α╕úα╕╖α╕¡ calcium channel blocker α╣Çα╕¢α╣ëα╕▓α╕½α╕íα╕▓α╕óα╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╕¬α╕│α╕½α╕úα╕▒α╕Üα╕£α╕╣α╣ëα╕¢α╣êα╕ºα╕óα╕ùα╕▒α╣êα╕ºα╣äα╕¢α╕äα╕╖α╕¡ <130/80 mmHg	clinical_guideline	Thai Hypertension Society Guidelines 2024	\N	{"category": "hypertension", "language": "th", "specialty": "cardiology"}	2026-01-20 08:46:27.47292+00
41c3e164-c30e-4949-8e84-6f2fb32626a6	Type 2 Diabetes management: Target HbA1c <7% for most adults. First-line: Metformin unless contraindicated (eGFR <30). Add SGLT2 inhibitor for patients with CKD or heart failure. GLP-1 RA preferred for weight management.	clinical_guideline	Thai Diabetes Association 2024	\N	{"category": "diabetes", "language": "en", "specialty": "endocrinology"}	2026-01-20 08:46:27.47292+00
27aa8874-85bc-44ce-bb94-720559e1d6fc	Chronic Kidney Disease (CKD) staging: Stage 1 (eGFR ΓëÑ90 with kidney damage), Stage 2 (60-89), Stage 3a (45-59), Stage 3b (30-44), Stage 4 (15-29), Stage 5 (<15). Drug dose adjustment required: Avoid NSAIDs, adjust Metformin (reduce if eGFR 30-45, stop if <30).	clinical_guideline	Nephrology Society of Thailand 2024	\N	{"category": "nephrology", "language": "en", "specialty": "nephrology"}	2026-01-20 08:46:27.47292+00
53d56c2a-b867-4fc6-9b37-81184dfe93c6	Hypertension (HTN) is defined as systolic blood pressure ΓëÑ140 mmHg or diastolic blood pressure ΓëÑ90 mmHg. First-line treatment includes lifestyle modifications (DASH diet, exercise, sodium restriction) and medication with ACE inhibitors, ARBs, or calcium channel blockers. Target BP for most patients is <130/80 mmHg.	clinical_guideline	Thai Hypertension Society Guidelines 2024	\N	{"tags": ["blood pressure", "antihypertensive"], "category": "hypertension", "language": "en", "specialty": "cardiology"}	2026-01-20 08:51:38.067591+00
d135778c-85d0-4ecb-a109-d9a578a00cf0	α╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╣éα╕Ñα╕½α╕┤α╕òα╕¬α╕╣α╕ç (Hypertension) α╕½α╕íα╕▓α╕óα╕ûα╕╢α╕ç α╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╕ïα╕┤α╕¬α╣éα╕òα╕Ñα╕┤α╕ü ΓëÑ140 mmHg α╕½α╕úα╕╖α╕¡α╣äα╕öα╣üα╕¡α╕¬α╣éα╕òα╕Ñα╕┤α╕ü ΓëÑ90 mmHg α╕üα╕▓α╕úα╕úα╕▒α╕üα╕⌐α╕▓α╣Çα╕úα╕┤α╣êα╕íα╕òα╣ëα╕Öα╕öα╣ëα╕ºα╕óα╕üα╕▓α╕úα╕¢α╕úα╕▒α╕Üα╕₧α╕ñα╕òα╕┤α╕üα╕úα╕úα╕í (α╕¡α╕▓α╕½α╕▓α╕ú DASH, α╕¡α╕¡α╕üα╕üα╕│α╕Ñα╕▒α╕çα╕üα╕▓α╕ó, α╕Ñα╕öα╣Çα╕üα╕Ñα╕╖α╕¡) α╣üα╕Ñα╕░α╕óα╕▓ ACE inhibitor, ARB α╕½α╕úα╕╖α╕¡ calcium channel blocker α╣Çα╕¢α╣ëα╕▓α╕½α╕íα╕▓α╕óα╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╕¬α╕│α╕½α╕úα╕▒α╕Üα╕£α╕╣α╣ëα╕¢α╣êα╕ºα╕óα╕ùα╕▒α╣êα╕ºα╣äα╕¢α╕äα╕╖α╕¡ <130/80 mmHg	clinical_guideline	Thai Hypertension Society Guidelines 2024	\N	{"category": "hypertension", "language": "th", "specialty": "cardiology"}	2026-01-20 08:51:38.067591+00
95aca019-750d-4d24-9153-7cd1d8fa530c	Type 2 Diabetes management: Target HbA1c <7% for most adults. First-line: Metformin unless contraindicated (eGFR <30). Add SGLT2 inhibitor for patients with CKD or heart failure. GLP-1 RA preferred for weight management.	clinical_guideline	Thai Diabetes Association 2024	\N	{"category": "diabetes", "language": "en", "specialty": "endocrinology"}	2026-01-20 08:51:38.067591+00
14aea577-3ea1-44b3-8b3f-c6d056e62479	Chronic Kidney Disease (CKD) staging: Stage 1 (eGFR ΓëÑ90 with kidney damage), Stage 2 (60-89), Stage 3a (45-59), Stage 3b (30-44), Stage 4 (15-29), Stage 5 (<15). Drug dose adjustment required: Avoid NSAIDs, adjust Metformin (reduce if eGFR 30-45, stop if <30).	clinical_guideline	Nephrology Society of Thailand 2024	\N	{"category": "nephrology", "language": "en", "specialty": "nephrology"}	2026-01-20 08:51:38.067591+00
\.


--
-- Data for Name: lab_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_orders (id, emr_id, appointment_id, patient_id, doctor_id, tests, priority, lab_name, results, ai_analysis, status, ordered_at, completed_at) FROM stdin;
\.


--
-- Data for Name: living_wills; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.living_wills (id, patient_id, statement, treatments, representatives, signature, pdpa_consent, status, signed_at, created_at, updated_at, audit_log) FROM stdin;
\.


--
-- Data for Name: medical_content; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medical_content (id, title_thai, title_english, content_thai, content_english, category, tags, author_id, status, published_at, view_count, created_at, updated_at) FROM stdin;
MC-BP-001	α╕ùα╕│α╕äα╕ºα╕▓α╕íα╣Çα╕éα╣ëα╕▓α╣âα╕êα╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╣éα╕Ñα╕½α╕┤α╕ò: α╕äα╕╣α╣êα╕íα╕╖α╕¡α╕ëα╕Üα╕▒α╕Üα╕¬α╕íα╕Üα╕╣α╕úα╕ôα╣î	Understanding Blood Pressure: A Complete Guide	# α╕ùα╕│α╕äα╕ºα╕▓α╕íα╣Çα╕éα╣ëα╕▓α╣âα╕êα╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╣éα╕Ñα╕½α╕┤α╕ò\r\n\r\n## α╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╣éα╕Ñα╕½α╕┤α╕òα╕äα╕╖α╕¡α╕¡α╕░α╣äα╕ú?\r\nα╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╣éα╕Ñα╕½α╕┤α╕òα╕äα╕╖α╕¡α╣üα╕úα╕çα╕ùα╕╡α╣êα╣Çα╕Ñα╕╖α╕¡α╕öα╕üα╕öα╕£α╕Öα╕▒α╕çα╕½α╕Ñα╕¡α╕öα╣Çα╕Ñα╕╖α╕¡α╕ö α╕ºα╕▒α╕öα╣Çα╕¢α╣çα╕Ö mmHg:\r\n- **α╕äα╣êα╕▓α╕Üα╕Ö**: α╣üα╕úα╕çα╕öα╕▒α╕Öα╕òα╕¡α╕Öα╕½α╕▒α╕ºα╣âα╕êα╕Üα╕╡α╕Üα╕òα╕▒α╕º\r\n- **α╕äα╣êα╕▓α╕Ñα╣êα╕▓α╕ç**: α╣üα╕úα╕çα╕öα╕▒α╕Öα╕òα╕¡α╕Öα╕½α╕▒α╕ºα╣âα╕êα╕äα╕Ñα╕▓α╕óα╕òα╕▒α╕º\r\n\r\n## α╕äα╣êα╕▓α╕¢α╕üα╕òα╕┤\r\n- α╕¢α╕üα╕òα╕┤: α╕òα╣êα╕│α╕üα╕ºα╣êα╕▓ 120/80 mmHg\r\n- α╕¬α╕╣α╕çα╣Çα╕Ñα╣çα╕üα╕Öα╣ëα╕¡α╕ó: 120-129/<80 mmHg\r\n- α╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╕¬α╕╣α╕çα╕úα╕░α╕öα╕▒α╕Ü 1: 130-139/80-89 mmHg\r\n- α╕äα╕ºα╕▓α╕íα╕öα╕▒α╕Öα╕¬α╕╣α╕çα╕úα╕░α╕öα╕▒α╕Ü 2: 140/90+ mmHg	# Understanding Blood Pressure\r\n\r\n## What is Blood Pressure?\r\nBlood pressure is the force of blood pushing against your artery walls. It is measured in mmHg with two numbers:\r\n- **Systolic (top)**: Pressure when heart beats\r\n- **Diastolic (bottom)**: Pressure when heart rests\r\n\r\n## Normal Ranges\r\n- Normal: Less than 120/80 mmHg\r\n- Elevated: 120-129/<80 mmHg\r\n- Stage 1 Hypertension: 130-139/80-89 mmHg\r\n- Stage 2 Hypertension: 140/90+ mmHg\r\n\r\n## Managing Blood Pressure\r\n1. **Diet**: Reduce sodium, eat fruits/vegetables\r\n2. **Exercise**: 150 minutes moderate activity weekly\r\n3. **Weight**: Maintain healthy BMI\r\n4. **Medications**: Take as prescribed\r\n5. **Monitoring**: Check regularly at home	general-health	["hypertension", "cardiovascular", "prevention"]	DOC-TEST-001	published	2025-12-21 08:51:38.06142+00	1250	2025-12-21 08:51:38.06142+00	2026-01-20 08:51:38.06142+00
MC-DM-001	α╕¡α╕óα╕╣α╣êα╕üα╕▒α╕Üα╣Çα╕Üα╕▓α╕½α╕ºα╕▓α╕Ö: α╕äα╕╣α╣êα╕íα╕╖α╕¡α╕¢α╕úα╕░α╕êα╕│α╕ºα╕▒α╕Ö	Living with Diabetes: Your Daily Guide	# α╕¡α╕óα╕╣α╣êα╕üα╕▒α╕Üα╣Çα╕Üα╕▓α╕½α╕ºα╕▓α╕Ö\r\n\r\n## α╣Çα╕éα╣ëα╕▓α╣âα╕êα╕úα╕░α╕öα╕▒α╕Üα╕Öα╣ëα╕│α╕òα╕▓α╕Ñα╣âα╕Öα╣Çα╕Ñα╕╖α╕¡α╕ö\r\nα╣Çα╕¢α╣ëα╕▓α╕½α╕íα╕▓α╕óα╕úα╕░α╕öα╕▒α╕Üα╕Öα╣ëα╕│α╕òα╕▓α╕Ñ:\r\n- α╕üα╣êα╕¡α╕Öα╕¡α╕▓α╕½α╕▓α╕ú: 80-130 mg/dL\r\n- α╕½α╕Ñα╕▒α╕çα╕¡α╕▓α╕½α╕▓α╕ú 2 α╕èα╕í.: <180 mg/dL\r\n- HbA1c: <7%\r\n\r\n## α╣Çα╕äα╕Ñα╣çα╕öα╕Ñα╕▒α╕Üα╕üα╕▓α╕úα╕öα╕╣α╣üα╕Ñα╕¢α╕úα╕░α╕êα╕│α╕ºα╕▒α╕Ö\r\n1. α╕òα╕úα╕ºα╕êα╕Öα╣ëα╕│α╕òα╕▓α╕Ñα╕¬α╕íα╣êα╕│α╣Çα╕¬α╕íα╕¡\r\n2. α╕ùα╕▓α╕Öα╕óα╕▓α╕òα╕úα╕çα╣Çα╕ºα╕Ñα╕▓\r\n3. α╕äα╕ºα╕Üα╕äα╕╕α╕íα╕¡α╕▓α╕½α╕▓α╕úα╕äα╕▓α╕úα╣îα╣éα╕Üα╣äα╕«α╣Çα╕öα╕úα╕ò\r\n4. α╕¡α╕¡α╕üα╕üα╕│α╕Ñα╕▒α╕çα╕üα╕▓α╕ó 30 α╕Öα╕▓α╕ùα╕╡α╕òα╣êα╕¡α╕ºα╕▒α╕Ö\r\n5. α╕òα╕úα╕ºα╕êα╣Çα╕ùα╣ëα╕▓α╕ùα╕╕α╕üα╕ºα╕▒α╕Ö	# Living with Diabetes\r\n\r\n## Understanding Your Blood Sugar\r\nTarget blood glucose levels:\r\n- Before meals: 80-130 mg/dL\r\n- 2 hours after meals: <180 mg/dL\r\n- HbA1c goal: <7%\r\n\r\n## Daily Management Tips\r\n1. **Monitor regularly** - Check glucose as directed\r\n2. **Take medications** - Same time daily\r\n3. **Healthy eating** - Control carbohydrate portions\r\n4. **Stay active** - 30 minutes daily exercise\r\n5. **Check feet daily** - Look for cuts or sores	chronic-disease	["diabetes", "chronic-care", "lifestyle"]	DOC-TEST-001	published	2025-12-26 08:51:38.06142+00	980	2025-12-26 08:51:38.06142+00	2026-01-20 08:51:38.06142+00
MC-SLEEP-001	α╕Öα╕¡α╕Öα╕½α╕Ñα╕▒α╕Üα╕öα╕╡ α╕¬α╕╕α╕éα╕áα╕▓α╕₧α╕öα╕╡	Better Sleep for Better Health	# α╕Öα╕¡α╕Öα╕½α╕Ñα╕▒α╕Üα╕öα╕╡ α╕¬α╕╕α╕éα╕áα╕▓α╕₧α╕öα╕╡\r\n\r\n## α╕ùα╕│α╣äα╕íα╕üα╕▓α╕úα╕Öα╕¡α╕Öα╕½α╕Ñα╕▒α╕Üα╕¬α╕│α╕äα╕▒α╕ì\r\nα╕£α╕╣α╣ëα╣âα╕½α╕ìα╣êα╕òα╣ëα╕¡α╕çα╕üα╕▓α╕úα╕Öα╕¡α╕Öα╕½α╕Ñα╕▒α╕Ü 7-9 α╕èα╕▒α╣êα╕ºα╣éα╕íα╕ç α╕üα╕▓α╕úα╕Öα╕¡α╕Öα╣äα╕íα╣êα╕öα╕╡α╣Çα╕₧α╕┤α╣êα╕íα╕äα╕ºα╕▓α╕íα╣Çα╕¬α╕╡α╣êα╕óα╕ç:\r\n- α╣éα╕úα╕äα╕½α╕▒α╕ºα╣âα╕ê\r\n- α╣Çα╕Üα╕▓α╕½α╕ºα╕▓α╕Ö\r\n- α╕ïα╕╢α╕íα╣Çα╕¿α╕úα╣ëα╕▓\r\n- α╕áα╕╣α╕íα╕┤α╕äα╕╕α╣ëα╕íα╕üα╕▒α╕Öα╕¡α╣êα╕¡α╕Öα╣üα╕¡\r\n\r\n## α╣Çα╕äα╕Ñα╣çα╕öα╕Ñα╕▒α╕Üα╕üα╕▓α╕úα╕Öα╕¡α╕Öα╕½α╕Ñα╕▒α╕Üα╕ùα╕╡α╣êα╕öα╕╡\r\n1. α╕Öα╕¡α╕Öα╣Çα╕ºα╕Ñα╕▓α╣Çα╕öα╕┤α╕íα╕ùα╕╕α╕üα╕ºα╕▒α╕Ö\r\n2. α╕½α╣ëα╕¡α╕çα╕íα╕╖α╕ö α╣Çα╕óα╣çα╕Öα╕¬α╕Üα╕▓α╕ó\r\n3. α╕çα╕öα╕½α╕Öα╣ëα╕▓α╕êα╕¡ 1 α╕èα╕í.α╕üα╣êα╕¡α╕Öα╕Öα╕¡α╕Ö\r\n4. α╕çα╕öα╕üα╕▓α╣üα╕ƒα╕½α╕Ñα╕▒α╕çα╕Üα╣êα╕▓α╕ó 2\r\n5. α╕¡α╕¡α╕üα╕üα╕│α╕Ñα╕▒α╕çα╕üα╕▓α╕óα╕¬α╕íα╣êα╕│α╣Çα╕¬α╕íα╕¡	# Better Sleep for Better Health\r\n\r\n## Why Sleep Matters\r\nAdults need 7-9 hours of quality sleep. Poor sleep increases risk of:\r\n- Heart disease\r\n- Diabetes\r\n- Depression\r\n- Weakened immunity\r\n\r\n## Sleep Hygiene Tips\r\n1. **Consistent schedule** - Same bedtime daily\r\n2. **Cool, dark room** - 65-68┬░F ideal\r\n3. **Limit screens** - No devices 1 hour before bed\r\n4. **Avoid caffeine** - No coffee after 2 PM\r\n5. **Exercise regularly** - But not before bed	wellness	["sleep", "wellness", "mental-health"]	DOC-TEST-001	published	2025-12-31 08:51:38.06142+00	756	2025-12-31 08:51:38.06142+00	2026-01-20 08:51:38.06142+00
\.


--
-- Data for Name: meeting_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.meeting_records (id, appointment_id, doctor_id, patient_id, recording_url, transcript, ai_summary, ai_recommendations, section_summaries, duration_minutes, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, title_thai, message, message_thai, data, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: patient_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient_profiles (patient_id, demographics, emergency_contact, insurance_info, created_at, updated_at) FROM stdin;
PATIENT-DEMO	{"gender": "male", "height": 175, "weight": 70, "allergies": ["Penicillin"], "blood_type": "O+", "date_of_birth": "1990-03-15", "chronic_conditions": []}	{"name": "Jane Demo", "phone": "+66834567890", "relationship": "spouse"}	{"provider": "Thai Health Insurance", "policy_number": "THI-2024-001"}	2026-01-20 08:51:38.046906+00	2026-01-20 08:51:38.046906+00
PATIENT-DEMO2	{"gender": "female", "height": 165, "weight": 55, "allergies": [], "blood_type": "A+", "date_of_birth": "1992-07-20", "chronic_conditions": ["Asthma"]}	{"name": "John Demo", "phone": "+66823456789", "relationship": "brother"}	\N	2026-01-20 08:51:38.046906+00	2026-01-20 08:51:38.046906+00
PATIENT-SOMCHAI	{"gender": "male", "height": 168, "weight": 72, "allergies": ["Penicillin"], "blood_type": "A+", "date_of_birth": "1959-03-15", "chronic_conditions": ["Hypertension"]}	{"name": "Somsri Mankong", "phone": "0891234568", "relationship": "wife"}	{"provider": "Thai Life Insurance", "policy_number": "TL-2024-123456"}	2026-01-20 08:51:38.046906+00	2026-01-20 08:51:38.046906+00
PATIENT-ANAN	{"gender": "male", "height": 165, "weight": 78, "allergies": ["Sulfa drugs", "NSAIDs"], "blood_type": "O+", "date_of_birth": "1964-08-22", "chronic_conditions": ["Type 2 Diabetes", "CKD Stage 3b"]}	{"name": "Anong Khayanrian", "phone": "0897654321", "relationship": "daughter"}	{"provider": "Bangkok Insurance", "policy_number": "BI-2024-789012"}	2026-01-20 08:51:38.046906+00	2026-01-20 08:51:38.046906+00
\.


--
-- Data for Name: phr; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.phr (id, patient_id, demographics, vital_signs_history, allergies, chronic_conditions, medications, vaccinations, lifestyle, family_history, surgical_history, social_history, latest_lab_results, clinical_decision_support, created_at, updated_at, last_synced_at) FROM stdin;
\.


--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prescriptions (id, emr_id, appointment_id, patient_id, doctor_id, medications, pharmacy_instructions, cds_warnings, cds_approved, status, dispensed_at, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (id, user_id, token, ip_address, user_agent, created_at, expires_at, logged_out_at) FROM stdin;
36837b18-634b-4fcb-a811-f084c19372c6	PATIENT-DEMO	9015c87d9cadab7bb3b7e518bac402fa8e966d2d436b16971ccf9e3d2a0e7735	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.26200; en-US) PowerShell/7.5.4	2026-01-20 08:55:17.266487+00	2026-01-21 08:55:17.266+00	\N
d6e21eb1-c0cd-4296-8a82-cb9d1796719d	PATIENT-DEMO	e347d5aaf55f94f415597cf6179e0df7adc3bc676d8614bada09c258cbe3be27	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.26200; en-US) PowerShell/7.5.4	2026-01-20 08:55:37.225886+00	2026-01-21 08:55:37.225+00	\N
1abff0ef-afb8-425f-8679-5dc11e9fdea6	PATIENT-DEMO	943a38ffda8d66d2cc9cedf41d9866b49d97b397fadae5fd2dc59287b665d730	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.26200; en-US) PowerShell/7.5.4	2026-01-20 08:57:51.011249+00	2026-01-21 08:57:51.01+00	\N
3dd46fe2-9b7b-4af9-bb79-b7cd45c280e5	PATIENT-DEMO	8512dda34302603f74edc319177d6ac145f9c594c3133387a5e16839ff0b6fea	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:28.114002+00	2026-01-21 09:16:28.113+00	\N
5db8e65e-4d13-4141-b9a5-760d8383979d	PATIENT-DEMO	f5785ac6a1f3ac3b07872f73151312476f6891ece64363d2910ab366eb893c5f	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:29.504701+00	2026-01-21 09:16:29.504+00	\N
b11d9ecc-30fb-44a3-8af4-50316b2feabd	PATIENT-DEMO	035ab905f2f97c6ac8c0c7489cb681a3e0b961818ebcdf6d05fef2f8fcd599c9	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:29.636193+00	2026-01-21 09:16:29.635+00	\N
58974462-44d1-45f1-881f-d37f31b6af7e	PATIENT-DEMO	dfc047ac95d640b14632a755efd7c2a0a4b3da4ff83f790fd5d1d1f9a566ac36	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:29.979338+00	2026-01-21 09:16:29.979+00	\N
108cd737-0c4c-4a66-b156-2b2210c405b3	PATIENT-DEMO	6579b86e07b180bbb82dd8ecbd55cab93fc708f49558865a2667dc406e94c059	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:31.421858+00	2026-01-21 09:16:31.421+00	\N
3446c2fe-9d99-4c54-8075-9e50363891d6	PATIENT-DEMO	8fba75bb6f37278be1f28b20f464698e4e3ef490ec5d092ecdbecabb6eba212e	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:32.251136+00	2026-01-21 09:16:32.25+00	\N
4ea64ffa-1bee-4c7c-945b-c7ca50fc5376	PATIENT-DEMO	147838b707305560c63b8b993386edb6a9868ff99e627576320f64c13b2732f4	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:33.554738+00	2026-01-21 09:16:33.554+00	\N
8ec849b5-2362-4719-8d08-a72a61642125	PATIENT-DEMO	f2e40c77d2ee24131274d9fe75a502536b4c5ca7d1211010d4034207f7c90fa6	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:34.401878+00	2026-01-21 09:16:34.401+00	\N
bef8e41d-8261-4e25-8c19-a8428cd529ef	PATIENT-DEMO	56c4f7dcc46f4dbbbb3604355e31710653d5b2a3f2428812708e04ae9ad726bb	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:35.646194+00	2026-01-21 09:16:35.645+00	\N
01ffe9ee-eee3-4e78-8001-a3334562c263	PATIENT-DEMO	d756301c733df4e67e99c37c89ae42331271cd2d271ea10e870d5d3e085fcb48	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:35.784824+00	2026-01-21 09:16:35.784+00	\N
0c20fe57-a55d-4e49-a858-358a6dbaedf4	PATIENT-DEMO	c4568029a42fc440e498fec33085f64b4f7a279479645c1f045efc0f8e22a5ac	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:36.029168+00	2026-01-21 09:16:36.028+00	\N
9f6f58f7-2f16-43f6-8119-6eaa79520c25	PATIENT-DEMO	05990fc651ac74d047d7f35483b698cc343b73908c053c46b0c2924499dbaac6	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:39.35972+00	2026-01-21 09:16:39.359+00	\N
74923e08-e4ad-4aa6-9fa5-4879352b1ac8	PATIENT-DEMO	dacf7795a207fa6354afee27bf20c4583e7fd433cead486fe1def46e8537625f	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:39.594694+00	2026-01-21 09:16:39.594+00	\N
df3aa1d4-f394-42ab-8365-92bce58418ac	PATIENT-DEMO	a9fbd062b52f61504ec96080763842cadf0452e7125d5564d740e812442ed630	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:39.594746+00	2026-01-21 09:16:39.594+00	\N
a34f4096-d4f0-4710-b268-88239df8ac41	PATIENT-DEMO	d88d48d863aca96b153cb8e16b36d9fbb54abc5a91c81f5fa1bdc061d067bf52	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:42.414677+00	2026-01-21 09:16:42.414+00	\N
eecb01ef-8089-486c-8165-d3fa77c1eed4	PATIENT-DEMO	31507e42981c4184910bdd4953ea0da6fcc7e140f0f3da8765fcb27727acea4f	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:42.551856+00	2026-01-21 09:16:42.551+00	\N
9a7800e7-2e8d-4bc3-abe4-ba73c8ef149b	PATIENT-DEMO	b0f485957e7db083974af04a37b440698f65d75703de3f16223d939a281092f2	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:46.148179+00	2026-01-21 09:16:46.147+00	\N
34b35c75-51dc-43b5-9c44-2e157bf361a9	PATIENT-DEMO	ea02cfc662127ba3458846cba6d4d663fb378db3207ff6f5f10270de1658efc6	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:46.620564+00	2026-01-21 09:16:46.62+00	\N
ad040516-0057-476b-85b5-c7c73ab4764b	PATIENT-DEMO	b85c980e29404ef89a98db4089a110185b62ba27d1e27a8b861e00c36f4e8660	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:47.593644+00	2026-01-21 09:16:47.593+00	\N
f429e034-1509-4ecb-b207-3de8125220e8	PATIENT-DEMO	66c64e6a54cf6793af7ece85246ca32f37075c55e5686f7f350f958a3be60f56	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:47.703013+00	2026-01-21 09:16:47.702+00	\N
08a947e8-cff2-4294-98ae-2a78fbee66e5	PATIENT-DEMO	aa84f6ac207833fae63afb142a79d7237c84969ea0513cf24cea83f4f5d6582f	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:52.264593+00	2026-01-21 09:16:52.264+00	\N
1544469f-05e9-4545-bb58-9566f7975a56	PATIENT-DEMO	1c25a50a786db4ac955b857cc2ce2f4e102a63ea8fae6216557123b81d3975f8	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:52.698507+00	2026-01-21 09:16:52.698+00	\N
cfc0c192-8823-40dd-a2c7-fe8f3eb9edb2	PATIENT-DEMO	1c46fc0d2f057f14f9be57d6d74c1f66d118391a1e6f9bfab749c1450d675b65	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:55.059501+00	2026-01-21 09:16:55.059+00	\N
302f56ac-50b0-4d29-b3a6-811510180f80	PATIENT-DEMO	296e83835b4202cdced3a35469e028c3075db1b15b0fa3dadeee9b24c58d51bc	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:56.509525+00	2026-01-21 09:16:56.509+00	\N
63451488-fd05-4ed8-9641-237a4538edfd	PATIENT-DEMO	ff743ac44b0c34293a34272f197a71997a5efb4953ce2427fd2eda93f9c70ce9	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:58.077161+00	2026-01-21 09:16:58.076+00	\N
50778d71-855a-418e-ad1c-04ecf185380d	PATIENT-DEMO	e141169a6962ec9010815849f7547f8bb1bb15d1c3ff9afc20f47c902670ff05	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:16:59.905355+00	2026-01-21 09:16:59.905+00	\N
5723e9e4-a83d-48a2-aaca-a53014b2ca3b	PATIENT-DEMO	26dadab60fbbc442b097dbb9ef26a6f415e1120d6bf6d821cfdabb525d1c624b	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:01.359602+00	2026-01-21 09:17:01.359+00	\N
1e07cb4e-e80c-4370-83af-1753e6207fbf	PATIENT-DEMO	c5ac49347f0695b515d37ebef39b2cf2a61ce930a1cf5b5bf7e37121193fee6c	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:02.126275+00	2026-01-21 09:17:02.125+00	\N
e873afe6-e73a-43f8-8216-e49802495c64	PATIENT-DEMO	ed7d5e5f8c9bd2d972af780eb83c26f4c598b032a4c870400198e7f3becccbb0	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:05.579816+00	2026-01-21 09:17:05.579+00	\N
862b6343-f2fa-4b98-a0b6-f5c72efa29ab	PATIENT-DEMO	d8cdd12cbc8a7594be99fcd3fa67ffc5282a84d8601111619fc4e264cc0a5a3a	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:09.155386+00	2026-01-21 09:17:09.155+00	\N
5f223813-1050-4e0b-9f28-39a990bd627f	PATIENT-DEMO	961fbb9e4e36057a219aa1196555f6da4620b848656524813baed330cb80f716	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:13.332374+00	2026-01-21 09:17:13.332+00	\N
eb932e37-f42c-4b4c-bbae-7f1cb49fc715	PATIENT-DEMO	0332c7b5227ae79b106f1b9faa7ea27d9c06cf6b95b84f99d28ec17c1875b537	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:17.104044+00	2026-01-21 09:17:17.103+00	\N
34cbbb84-a8b5-4ae9-b4a9-2653b3d2421b	PATIENT-DEMO	538fdee2534a27334539fd7fc7dae87eb559d739849399fd463da10b03e6c3ac	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:17.542825+00	2026-01-21 09:17:17.542+00	\N
52fa1765-746b-4bc2-b46d-3c6ef785621c	PATIENT-DEMO	291e0b1e7eb4acf2dbfd6821985cee84c8446e430b7c566f244acdcb630d4c7d	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:04.289581+00	2026-01-21 09:17:04.289+00	\N
eca446c7-1c60-4dd7-a301-c12985956cd1	PATIENT-DEMO	9728534a3f92d4ba24e4f511336fc065ede2defeb1670e03c1d8450aaa7735cb	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:06.621736+00	2026-01-21 09:17:06.621+00	\N
3863ab17-fb97-401a-b006-66324248620b	PATIENT-DEMO	152a9bc5ea4275d24a5f0950b4b91991c2d4c2d156f80b03905e93b06e5abf4c	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:10.327625+00	2026-01-21 09:17:10.327+00	\N
0079aebf-45a7-4154-a6e3-7386b17c22ff	PATIENT-DEMO	5fd374caef7caa15f1982beaf8c901f03505c37655d132eb7357fc3f9c9dd84d	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:15.506083+00	2026-01-21 09:17:15.505+00	\N
a1e22e54-9d0a-4341-9001-345839574295	PATIENT-DEMO	1feb3b55a1a4bfa3d89d093299294d3344a2f9d197b7e7a77382a4c81d63b006	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:16.524093+00	2026-01-21 09:17:16.523+00	\N
f374a478-7b85-4191-8d00-b9a93d4a62be	PATIENT-DEMO	a883fbacd0c71093a59b561476e3a21d0c3b6d1c1f529585d9e9cee43d4a5e41	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:18.979383+00	2026-01-21 09:17:18.979+00	\N
2f0423b0-e0a8-488c-bc58-a2ae6dea6bb9	PATIENT-DEMO	3b27f0356c3bd179d10c5858fe32f4d9765bd3c7ba410d3ac5553f4eb0539f1e	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:19.49212+00	2026-01-21 09:17:19.491+00	\N
56b8b23c-a2ce-4d4a-9beb-ac0d7fb40b2d	PATIENT-DEMO	cdc9442fc107d6e1f77ff60a63b7b55564dfdab285e5cfaf6f6f081874dc42a4	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:20.259427+00	2026-01-21 09:17:20.259+00	\N
20be4662-85f9-4346-8da7-598b7cbc644a	PATIENT-DEMO	720e404302d92c01e3ac7189000e6c4a42eb1b4043d959d1f7350a741cb6c5be	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:20.48204+00	2026-01-21 09:17:20.481+00	\N
1bda168e-3213-488a-97f8-0229a19313bd	PATIENT-DEMO	6c72e7c32213912903b00e98472c64d37f9c27f6c168412ce8aacbe9594216ee	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:21.901309+00	2026-01-21 09:17:21.9+00	\N
20a7d9f3-927d-4de4-a22b-e13cacffd126	PATIENT-DEMO	463b538229990e861f16bf905cfd6189573658fc2f0dada13ecaa545d0bb3767	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:23.375648+00	2026-01-21 09:17:23.375+00	\N
fbd18252-fcc0-460f-9bab-17a90675c162	PATIENT-DEMO	2aa4f278ed1ef6889a2a232e384113e5872d2b908a3828e029a2123830105be5	::ffff:172.20.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36	2026-01-20 09:17:27.600054+00	2026-01-21 09:17:27.599+00	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, role, name, name_thai, avatar_url, phone, date_of_birth, gender, national_id, doctor_id, medical_license_number, specialty, hospital_name, patient_id, is_active, is_verified, is_approved, approval_status, admin_privileges, is_admin, preferences, created_at, updated_at, last_login, login_attempts, locked_until) FROM stdin;
ADMIN-001	admin.test@izara.com	$2b$12$H1ESOcxJFH6w9UzIcwckh.HVVZyOnh.I1FHz9Wp.zVVj0t9t59PDa	admin	Dr. Admin Manager	α╕Öα╕₧. α╕£α╕╣α╣ëα╕öα╕╣α╣üα╕Ñα╕úα╕░α╕Üα╕Ü α╣âα╕êα╕öα╕╡	\N	+66891234567	\N	\N	\N	\N	\N	\N	\N	\N	t	t	t	approved	{"level": "super_admin", "canManageSystem": true, "canManageDoctors": true, "canApproveContent": true, "canManagePatients": true, "canViewAllRecords": true}	t	{"theme": "light", "language": "th", "notifications": true}	2026-01-20 08:51:38.034522+00	2026-01-20 08:55:11.44189+00	\N	0	\N
PATIENT-DEMO	demo.test@gmail.com	$2b$12$mZlpalCDYifZGFtzgZxgLu0n.dAqc6E3ceepNr3Uj.qyA/ix7TJ7K	patient	John Demo Patient	α╕Öα╕▓α╕ó α╕êα╕¡α╕½α╣îα╕Ö α╕ùα╕öα╕¬α╕¡α╕Ü α╕úα╕░α╕Üα╕Ü	\N	+66823456789	1990-03-15	male	1234567890123	\N	\N	\N	\N	PATIENT-DEMO	t	t	t	approved	\N	f	{"theme": "light", "language": "th", "notifications": true}	2026-01-20 08:51:38.040998+00	2026-01-20 09:17:27.604397+00	2026-01-20 09:17:27.604397+00	0	\N
PATIENT-DEMO2	demo2.test@gmail.com	$2b$12$mZlpalCDYifZGFtzgZxgLu0n.dAqc6E3ceepNr3Uj.qyA/ix7TJ7K	patient	Jane Demo Relative	α╕Öα╕▓α╕çα╕¬α╕▓α╕º α╣Çα╕êα╕Ö α╕ùα╕öα╕¬α╕¡α╕Ü α╕ìα╕▓α╕òα╕┤	\N	+66834567890	1992-07-20	female	1234567890124	\N	\N	\N	\N	PATIENT-DEMO2	t	t	t	approved	\N	f	{"theme": "light", "language": "th", "notifications": true}	2026-01-20 08:51:38.040998+00	2026-01-20 08:54:49.744645+00	\N	0	\N
PATIENT-SOMCHAI	Somchai.Mankong@gmail.com	$2b$12$mZlpalCDYifZGFtzgZxgLu0n.dAqc6E3ceepNr3Uj.qyA/ix7TJ7K	patient	Mr. Somchai Mankong	α╕Öα╕▓α╕ó α╕¬α╕íα╕èα╕▓α╕ó α╕íα╕▒α╣êα╕Öα╕äα╕ç	\N	+66845678901	1959-03-15	male	3100500123456	\N	\N	\N	\N	PATIENT-SOMCHAI	t	t	t	approved	\N	f	{"theme": "light", "language": "th", "notifications": true}	2026-01-20 08:51:38.040998+00	2026-01-20 08:54:49.744645+00	\N	0	\N
DOC-TEST-001	doctor.test@izara.com	$2b$12$7OPTgyoy5FDy9aea/AfQcuiWlvuhD5CmRbMKHJ7G7Mhp6WWTLE7bW	doctor	Dr. Sarah Johnson	α╕Öα╕₧. α╕ïα╕▓α╕úα╣êα╕▓ α╕êα╕¡α╕½α╣îα╕Öα╕¬α╕▒α╕Ö	\N	+66812345678	\N	\N	\N	DOC-TEST-001	MD-2024-001	General Practice	Izara Virtual Hospital	\N	t	t	t	approved	\N	f	{"theme": "light", "language": "th", "notifications": true}	2026-01-20 08:51:38.037815+00	2026-01-20 08:55:11.266435+00	\N	0	\N
DOC-UNIT-001	doctorunit.test@izara.com	$2b$12$7OPTgyoy5FDy9aea/AfQcuiWlvuhD5CmRbMKHJ7G7Mhp6WWTLE7bW	doctor	Dr. Unit Test	α╕Öα╕₧. α╕óα╕╣α╕Öα╕┤α╕ò α╣Çα╕ùα╕¬α╕òα╣î	\N	+66813456789	\N	\N	\N	DOC-UNIT-001	MD-2024-002	Internal Medicine	Izara Virtual Hospital	\N	t	t	t	approved	\N	f	{"theme": "light", "language": "th", "notifications": true}	2026-01-20 08:51:38.037815+00	2026-01-20 08:55:11.266435+00	\N	0	\N
PATIENT-ANAN	Anan.Khayanrian@gmail.com	$2b$12$mZlpalCDYifZGFtzgZxgLu0n.dAqc6E3ceepNr3Uj.qyA/ix7TJ7K	patient	Mr. Anan Khayanrian	α╕Öα╕▓α╕ó α╕¡α╕Öα╕▒α╕Öα╕òα╣î α╕éα╕óα╕▒α╕Öα╣Çα╕úα╕╡α╕óα╕Ö	\N	+66856789012	1964-08-22	male	3100500789012	\N	\N	\N	\N	PATIENT-ANAN	t	t	t	approved	\N	f	{"theme": "light", "language": "th", "notifications": true}	2026-01-20 08:51:38.040998+00	2026-01-20 08:54:49.744645+00	\N	0	\N
\.


--
-- Data for Name: vital_signs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vital_signs (id, patient_id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, respiratory_rate, oxygen_saturation, blood_glucose, blood_glucose_type, weight, height, bmi, measured_at, source, notes) FROM stdin;
de79e9eb-685e-43dd-966b-1feded2e813d	PATIENT-DEMO	118	76	72	36.5	14	99	95	random	70.0	175.0	22.9	2026-01-20 07:51:38.049964+00	patient_input	Morning check
44f9429a-46ef-4505-b766-e9f60fa97899	PATIENT-DEMO	122	78	75	36.6	15	98	100	fasting	70.0	175.0	22.9	2026-01-19 08:51:38.049964+00	patient_input	After lunch
6cb19088-3b6d-4e0f-91c7-d102a5c0d3b2	PATIENT-SOMCHAI	145	92	78	36.5	16	98	\N	\N	72.0	168.0	25.5	2026-01-20 06:51:38.049964+00	patient_input	Morning measurement before medication
66d32cab-e0ac-4bdd-a7bf-cbd5f301ab2c	PATIENT-SOMCHAI	138	88	72	36.4	14	99	\N	\N	72.0	168.0	25.5	2026-01-19 08:51:38.049964+00	patient_input	After morning walk
c75ff4dc-b4cd-45f5-a180-2870298cc19f	PATIENT-ANAN	142	88	80	36.6	16	97	185	fasting	78.0	165.0	28.7	2026-01-20 07:51:38.049964+00	patient_input	Fasting glucose before breakfast
d77d6388-f105-4e52-b9b3-7c7e24e8422f	PATIENT-ANAN	138	85	76	36.5	14	98	220	postprandial	78.0	165.0	28.7	2026-01-20 02:51:38.049964+00	patient_input	2 hours after lunch
\.


--
-- Name: ai_chat_history ai_chat_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_history
    ADD CONSTRAINT ai_chat_history_pkey PRIMARY KEY (id);


--
-- Name: ai_document_analysis ai_document_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_document_analysis
    ADD CONSTRAINT ai_document_analysis_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cds_logs cds_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cds_logs
    ADD CONSTRAINT cds_logs_pkey PRIMARY KEY (id);


--
-- Name: clinical_resources clinical_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_resources
    ADD CONSTRAINT clinical_resources_pkey PRIMARY KEY (id);


--
-- Name: consultants consultants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultants
    ADD CONSTRAINT consultants_pkey PRIMARY KEY (id);


--
-- Name: doctor_profiles doctor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_profiles
    ADD CONSTRAINT doctor_profiles_pkey PRIMARY KEY (doctor_id);


--
-- Name: drugs drugs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drugs
    ADD CONSTRAINT drugs_pkey PRIMARY KEY (id);


--
-- Name: emr emr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emr
    ADD CONSTRAINT emr_pkey PRIMARY KEY (id);


--
-- Name: icd10_codes icd10_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.icd10_codes
    ADD CONSTRAINT icd10_codes_pkey PRIMARY KEY (code);


--
-- Name: knowledge_base knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: lab_orders lab_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_pkey PRIMARY KEY (id);


--
-- Name: living_wills living_wills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.living_wills
    ADD CONSTRAINT living_wills_pkey PRIMARY KEY (id);


--
-- Name: medical_content medical_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_content
    ADD CONSTRAINT medical_content_pkey PRIMARY KEY (id);


--
-- Name: meeting_records meeting_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_records
    ADD CONSTRAINT meeting_records_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: patient_profiles patient_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_profiles
    ADD CONSTRAINT patient_profiles_pkey PRIMARY KEY (patient_id);


--
-- Name: phr phr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phr
    ADD CONSTRAINT phr_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vital_signs vital_signs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_signs
    ADD CONSTRAINT vital_signs_pkey PRIMARY KEY (id);


--
-- Name: idx_ai_chat_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_chat_session ON public.ai_chat_history USING btree (session_id);


--
-- Name: idx_ai_chat_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_chat_user_id ON public.ai_chat_history USING btree (user_id);


--
-- Name: idx_appointments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_date ON public.appointments USING btree (confirmed_date);


--
-- Name: idx_appointments_doctor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_doctor_id ON public.appointments USING btree (doctor_id);


--
-- Name: idx_appointments_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_patient_id ON public.appointments USING btree (patient_id);


--
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_emr_appointment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emr_appointment_id ON public.emr USING btree (appointment_id);


--
-- Name: idx_emr_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emr_patient_id ON public.emr USING btree (patient_id);


--
-- Name: idx_knowledge_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_embedding ON public.knowledge_base USING ivfflat (embedding public.vector_cosine_ops);


--
-- Name: idx_notifications_read_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_phr_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phr_patient_id ON public.phr USING btree (patient_id);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_vital_signs_measured_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vital_signs_measured_at ON public.vital_signs USING btree (measured_at);


--
-- Name: idx_vital_signs_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vital_signs_patient_id ON public.vital_signs USING btree (patient_id);


--
-- Name: appointments update_appointments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: emr update_emr_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_emr_updated_at BEFORE UPDATE ON public.emr FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: phr update_phr_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_phr_updated_at BEFORE UPDATE ON public.phr FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_chat_history ai_chat_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_history
    ADD CONSTRAINT ai_chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ai_document_analysis ai_document_analysis_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_document_analysis
    ADD CONSTRAINT ai_document_analysis_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);


--
-- Name: ai_document_analysis ai_document_analysis_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_document_analysis
    ADD CONSTRAINT ai_document_analysis_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);


--
-- Name: cds_logs cds_logs_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cds_logs
    ADD CONSTRAINT cds_logs_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: cds_logs cds_logs_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cds_logs
    ADD CONSTRAINT cds_logs_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: cds_logs cds_logs_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cds_logs
    ADD CONSTRAINT cds_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);


--
-- Name: clinical_resources clinical_resources_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_resources
    ADD CONSTRAINT clinical_resources_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: doctor_profiles doctor_profiles_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_profiles
    ADD CONSTRAINT doctor_profiles_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: emr emr_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emr
    ADD CONSTRAINT emr_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: emr emr_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emr
    ADD CONSTRAINT emr_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: emr emr_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emr
    ADD CONSTRAINT emr_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);


--
-- Name: lab_orders lab_orders_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: lab_orders lab_orders_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: lab_orders lab_orders_emr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_emr_id_fkey FOREIGN KEY (emr_id) REFERENCES public.emr(id);


--
-- Name: lab_orders lab_orders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);


--
-- Name: living_wills living_wills_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.living_wills
    ADD CONSTRAINT living_wills_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);


--
-- Name: medical_content medical_content_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_content
    ADD CONSTRAINT medical_content_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: meeting_records meeting_records_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_records
    ADD CONSTRAINT meeting_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: meeting_records meeting_records_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_records
    ADD CONSTRAINT meeting_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: patient_profiles patient_profiles_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_profiles
    ADD CONSTRAINT patient_profiles_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);


--
-- Name: phr phr_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phr
    ADD CONSTRAINT phr_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);


--
-- Name: prescriptions prescriptions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: prescriptions prescriptions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: prescriptions prescriptions_emr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_emr_id_fkey FOREIGN KEY (emr_id) REFERENCES public.emr(id);


--
-- Name: prescriptions prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: vital_signs vital_signs_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_signs
    ADD CONSTRAINT vital_signs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict hXjl6gYCMaXouLjUtt8sVN63vUe7gwctSurqnxxPczBb606DwlTxHdIVdpidZ7D

