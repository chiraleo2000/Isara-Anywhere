#!/usr/bin/env node
/**
 * Rebuild page "11. Database ERD" in docs/diagrams/diagrams.drawio
 * — swimlane tables with black borders, grid layout, clean FK lines.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const masterPath = path.join(root, 'docs', 'diagrams', 'diagrams.drawio');

const SWIM =
  'swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=28;fillColor=#dae8fc;strokeColor=#000000;strokeWidth=2;fontColor=#000000;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=0;marginBottom=0;whiteSpace=wrap;html=1;';
const ROW =
  'text;strokeColor=#000000;fillColor=#ffffff;align=left;verticalAlign=middle;spacingLeft=6;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;whiteSpace=wrap;html=1;fontSize=9;fontColor=#000000;';
const ROW_ALT =
  'text;strokeColor=#000000;fillColor=#f5f5f5;align=left;verticalAlign=middle;spacingLeft=6;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;whiteSpace=wrap;html=1;fontSize=9;fontColor=#000000;';
const EDGE =
  'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;endFill=0;startFill=0;fontSize=9;fontColor=#000000;';
const EDGE_DASH =
  'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#666666;strokeWidth=1;dashed=1;endArrow=open;startArrow=open;fontSize=8;fontColor=#444444;';

const HEADER_COLORS = {
  auth: '#dae8fc',
  profile: '#d5e8d4',
  appt: '#fff2cc',
  meeting: '#e1d5e7',
  clinical: '#f8cecc',
  system: '#ffe6cc',
};

function table(id, name, x, y, w, fields, headerColor = '#dae8fc') {
  const rowH = 16;
  const h = 28 + fields.length * rowH;
  const swimStyle = SWIM.replace('#dae8fc', headerColor);
  const cells = [];
  cells.push(
    `        <mxCell id="${id}" value="${name}" style="${swimStyle}" vertex="1" parent="1">`,
    `          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />`,
    `        </mxCell>`,
  );
  fields.forEach((f, i) => {
    const rid = `${id}_r${i}`;
    const style = i % 2 === 0 ? ROW : ROW_ALT;
    const ry = 28 + i * rowH;
    cells.push(
      `        <mxCell id="${rid}" value="${f}" style="${style}" vertex="1" parent="${id}">`,
      `          <mxGeometry y="${ry}" width="${w}" height="${rowH}" as="geometry" />`,
      `        </mxCell>`,
    );
  });
  return { xml: cells.join('\n'), id, x, y, w, h };
}

function edge(id, source, target, label = '', dashed = false) {
  const style = dashed ? EDGE_DASH : EDGE;
  const val = label ? ` value="${label}"` : '';
  return `        <mxCell id="${id}" edge="1" parent="1" source="${source}" target="${target}" style="${style}"${val}>
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`;
}

function buildErdModel() {
  const W = 210;
  const tables = [];

  // Row 1 — Auth & identity (y=48)
  tables.push(
    table(
      'erd_users',
      'users',
      420,
      48,
      W,
      [
        'PK  id VARCHAR(50)',
        '    email VARCHAR UNIQUE',
        '    password_hash VARCHAR',
        '    role (patient|doctor|admin)',
        '    is_active BOOL',
        '    is_approved BOOL',
        '    created_at TIMESTAMPTZ',
      ],
      HEADER_COLORS.auth,
    ),
  );
  tables.push(
    table(
      'erd_sessions',
      'sessions',
      680,
      48,
      W,
      ['PK  id VARCHAR(128)', 'FK  user_id → users', '    token TEXT', '    expires_at TIMESTAMPTZ'],
      HEADER_COLORS.auth,
    ),
  );
  tables.push(
    table(
      'erd_living_wills',
      'living_wills',
      940,
      48,
      W,
      [
        'PK  id SERIAL',
        'FK  patient_id → users',
        '    treatments JSONB',
        '    is_shared_with_doctors BOOL',
        '    status · version INT',
      ],
      HEADER_COLORS.profile,
    ),
  );

  // Row 2 — Profiles (y=210)
  tables.push(
    table(
      'erd_patient_profiles',
      'patient_profiles',
      40,
      210,
      W,
      [
        'PK  id SERIAL',
        'FK  patient_id → users',
        '    demographics JSONB',
        '    allergies JSONB',
        '    medications JSONB',
      ],
      HEADER_COLORS.profile,
    ),
  );
  tables.push(
    table(
      'erd_doctor_profiles',
      'doctor_profiles',
      940,
      210,
      W,
      [
        'PK  id SERIAL',
        'FK  doctor_id → users',
        '    license_number VARCHAR',
        '    specialty VARCHAR',
        '    credentials JSONB',
      ],
      HEADER_COLORS.profile,
    ),
  );

  // Row 3 — Appointments & meetings (y=380)
  tables.push(
    table(
      'erd_appointments',
      'appointments',
      40,
      380,
      W,
      [
        'PK  id SERIAL',
        'FK  patient_id → users',
        'FK  doctor_id → users',
        '    status VARCHAR (7 states)',
        '    symptoms JSONB',
        '    jitsi_room_name VARCHAR',
        '    scheduled_at TIMESTAMPTZ',
      ],
      HEADER_COLORS.appt,
    ),
  );
  tables.push(
    table(
      'erd_meeting_records',
      'meeting_records',
      280,
      380,
      W,
      [
        'PK  id UUID',
        'FK  appointment_id → appointments',
        '    transcript TEXT',
        '    ai_summary JSONB',
        '    doctor_validation_status',
      ],
      HEADER_COLORS.meeting,
    ),
  );
  tables.push(
    table(
      'erd_meeting_transcripts',
      'meeting_transcripts',
      520,
      380,
      W,
      [
        'PK  id UUID',
        'FK  meeting_record_id',
        '    speaker_role (doctor|patient)',
        '    content TEXT',
        '    confidence FLOAT',
      ],
      HEADER_COLORS.meeting,
    ),
  );
  tables.push(
    table(
      'erd_emr',
      'emr',
      760,
      380,
      W,
      [
        'PK  id SERIAL',
        'FK  appointment_id → appointments',
        'FK  patient_id · doctor_id',
        '    subjective JSONB (S)',
        '    objective JSONB (O)',
        '    assessment JSONB (A)',
        '    plan JSONB (P)',
        '    status (draft|signed)',
      ],
      HEADER_COLORS.clinical,
    ),
  );

  // Row 4 — PHR & orders (y=580)
  tables.push(
    table(
      'erd_phr',
      'phr',
      40,
      580,
      W,
      [
        'PK  id SERIAL',
        'FK  patient_id → users',
        '    demographics JSONB',
        '    vital_signs_history JSONB',
        '    allergies JSONB',
      ],
      HEADER_COLORS.profile,
    ),
  );
  tables.push(
    table(
      'erd_vital_signs',
      'vital_signs',
      280,
      580,
      W,
      [
        'PK  id UUID',
        'FK  patient_id → users',
        '    blood_pressure_systolic INT',
        '    heart_rate INT',
        '    measured_at TIMESTAMPTZ',
      ],
      HEADER_COLORS.profile,
    ),
  );
  tables.push(
    table(
      'erd_prescriptions',
      'prescriptions',
      520,
      580,
      W,
      [
        'PK  id SERIAL',
        'FK  emr_id → emr',
        'FK  patient_id → users',
        '    medications JSONB',
        '    cds_warnings JSONB',
        '    status (active|dispensed)',
      ],
      HEADER_COLORS.clinical,
    ),
  );
  tables.push(
    table(
      'erd_lab_orders',
      'lab_orders',
      760,
      580,
      W,
      [
        'PK  id SERIAL',
        'FK  emr_id → emr',
        'FK  patient_id → users',
        '    test_name VARCHAR',
        '    status VARCHAR',
        '    results JSONB',
      ],
      HEADER_COLORS.clinical,
    ),
  );

  // Row 5 — System (y=780)
  tables.push(
    table(
      'erd_notifications',
      'notifications',
      40,
      780,
      W,
      [
        'PK  id UUID',
        'FK  user_id → users',
        '    type VARCHAR',
        '    title · message TEXT',
        '    read_at TIMESTAMPTZ',
      ],
      HEADER_COLORS.system,
    ),
  );
  tables.push(
    table(
      'erd_audit_logs',
      'audit_logs',
      280,
      780,
      W,
      [
        'PK  id SERIAL',
        'FK  user_id → users',
        'FK  patient_id → users',
        '    action · entity_type',
        '    created_at TIMESTAMPTZ',
      ],
      HEADER_COLORS.system,
    ),
  );
  tables.push(
    table(
      'erd_knowledge_base',
      'knowledge_base',
      520,
      780,
      W,
      [
        'PK  id SERIAL',
        '    content TEXT',
        '    embedding vector(768)',
        '    category VARCHAR',
        '    (pgvector RAG)',
      ],
      HEADER_COLORS.system,
    ),
  );

  const edges = [
    edge('erd_e1', 'erd_sessions', 'erd_users', 'user_id'),
    edge('erd_e2', 'erd_patient_profiles', 'erd_users', 'patient_id'),
    edge('erd_e3', 'erd_doctor_profiles', 'erd_users', 'doctor_id'),
    edge('erd_e4', 'erd_living_wills', 'erd_users', 'patient_id'),
    edge('erd_e5', 'erd_appointments', 'erd_users', 'patient_id'),
    edge('erd_e6', 'erd_appointments', 'erd_doctor_profiles', 'doctor_id'),
    edge('erd_e7', 'erd_meeting_records', 'erd_appointments', 'appointment_id'),
    edge('erd_e8', 'erd_meeting_transcripts', 'erd_meeting_records', 'meeting_record_id'),
    edge('erd_e9', 'erd_emr', 'erd_appointments', 'appointment_id'),
    edge('erd_e10', 'erd_phr', 'erd_users', 'patient_id'),
    edge('erd_e11', 'erd_vital_signs', 'erd_users', 'patient_id'),
    edge('erd_e12', 'erd_prescriptions', 'erd_emr', 'emr_id'),
    edge('erd_e13', 'erd_lab_orders', 'erd_emr', 'emr_id'),
    edge('erd_e14', 'erd_notifications', 'erd_users', 'user_id'),
    edge('erd_e15', 'erd_audit_logs', 'erd_users', 'user_id'),
    edge('erd_e16', 'erd_patient_profiles', 'erd_phr', '1:1', true),
    edge('erd_e17', 'erd_emr', 'erd_meeting_records', 'AI draft', true),
    edge('erd_e18', 'erd_knowledge_base', 'erd_emr', 'RAG/CDS', true),
    edge('erd_e19', 'erd_notifications', 'erd_appointments', 'events', true),
  ];

  const body = [
    ...tables.flatMap((t) => t.xml.split('\n')),
    ...edges,
    `        <mxCell id="erd_title" value="DATABASE ERD — PostgreSQL 18 · izara_phase1 · key tables (v1.7.48)" style="text;html=1;strokeColor=none;fillColor=none;align=center;fontSize=16;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="200" y="12" width="900" height="28" as="geometry" />
        </mxCell>`,
    `        <mxCell id="erd_legend" value="Legend: solid black = FK constraint · dashed gray = logical/data flow · tables have black borders" style="text;html=1;strokeColor=#000000;fillColor=#fffde7;align=center;fontSize=10;rounded=1;" vertex="1" parent="1">
          <mxGeometry x="40" y="920" width="980" height="28" as="geometry" />
        </mxCell>`,
    `        <mxCell id="erd_zone1" value="AUTH" style="text;html=1;strokeColor=#000000;fillColor=none;fontSize=10;fontStyle=1;align=left;" vertex="1" parent="1">
          <mxGeometry x="680" y="28" width="60" height="18" as="geometry" />
        </mxCell>`,
    `        <mxCell id="erd_hub" value="users hub" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#000000;strokeWidth=2;fontSize=10;fontStyle=2;dashed=1;" vertex="1" parent="1">
          <mxGeometry x="475" y="175" width="100" height="40" as="geometry" />
        </mxCell>`,
  ].join('\n');

  return `<mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${body}
      </root>
    </mxGraphModel>`;
}

function replaceErdDiagram(masterRaw, newModel) {
  const re = /<diagram name="11\. Database ERD" id="1716">[\s\S]*?<\/diagram>/;
  if (!re.test(masterRaw)) {
    throw new Error('Could not find diagram "11. Database ERD" (id=1716)');
  }
  const replacement = `  <diagram name="11. Database ERD" id="1716">\n    ${newModel}\n  </diagram>`;
  return masterRaw.replace(re, replacement);
}

const model = buildErdModel();
const masterRaw = fs.readFileSync(masterPath, 'utf8');
const updated = replaceErdDiagram(masterRaw, model);
fs.writeFileSync(masterPath, updated);
console.log('Rebuilt page 11 — Database ERD (black-bordered tables, aligned FK lines)');
