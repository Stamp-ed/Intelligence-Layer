# Stamped Intelligence System — Cursor Build Prompt
### Comprehensive AI Development Specification for Full-Stack Implementation
**Version:** 1.0 | **Prepared for:** Cursor AI | **Classification:** Internal Build Reference

---

## SECTION 0 — READ THIS FIRST

You are building **Stamped Intelligence System V1**, an internal AI-powered organizational knowledge and retrieval platform for **Stamped** — an AI-powered insurance fraud prevention company operating in the Indian general insurance market.

This document is your **complete source of truth**. Every architectural decision, design constraint, component, API contract, data model, and phase boundary is defined here. Do not infer, improvise, or deviate from these specifications unless a section explicitly grants you discretion.

Read the entire document before writing a single line of code.

---

## SECTION 1 — WHAT YOU ARE BUILDING

### 1.1 Product Summary

Stamped Intelligence System is an **internal AI-powered organizational knowledge and retrieval platform** built exclusively for the Stamped team. It is not a customer-facing product.

Its purpose is to:
- Centralize all organizational knowledge (strategic documents, research, product discussions, competitive intelligence, operational notes) into a single queryable system
- Preserve institutional memory that would otherwise be lost in scattered conversations and documents
- Enable fast, context-aware, semantic retrieval and AI-powered reasoning across all knowledge
- Allow any team member to query the system in natural language and receive accurate, source-attributed answers

Think of it as an **AI brain for the company** — one that knows everything the company has ever discussed, written, researched, or decided, and can answer questions about it intelligently.

### 1.2 The Core Problem It Solves

Stamped's team generates high-value strategic content across Discord discussions, Google Docs, markdown files, PDFs, and research notes. This content becomes fragmented and inaccessible over time. Critical decisions get buried. Research gets repeated. Institutional context is lost when team members are onboarded or when old threads become hard to find.

The Intelligence System solves this by:
- Ingesting all of this content into a unified, structured knowledge base
- Making it semantically searchable (meaning-based, not keyword-based)
- Enabling conversational querying with AI-generated answers that cite their sources
- Building a relationship graph between concepts, competitors, product ideas, and decisions

### 1.3 What This System Is NOT

- Not a customer-facing product
- Not a claims management tool
- Not a public API
- Not a real-time collaboration tool (V1)
- Not a code intelligence system (V1)
- Not a multi-tenant SaaS platform

---

## SECTION 2 — COMPANY CONTEXT (CRITICAL — READ BEFORE BUILDING)

Understanding Stamped as a company is essential because the Intelligence System's data models, entity extraction, and domain-specific reasoning must be calibrated to Stamped's world.

### 2.1 What Stamped Does

Stamped is a **B2B AI-powered insurance fraud prevention and operational efficiency platform** built for Indian general insurers. It is infrastructure — not a point solution or dashboard.

Stamped operates across four product layers:
1. **Capture Authenticity** — authenticates evidence at the point of capture (GPS binding, timestamp cryptography, device fingerprinting, metadata integrity)
2. **Claim Intelligence** — evaluates authenticated evidence using AI (damage analysis, cost benchmarking, document verification, anomaly detection, risk scoring)
3. **Network Intelligence** — builds an entity graph across policyholders, garages, hospitals, surveyors, and agents to detect networked and colluded fraud
4. **Investigation & Enforcement** — converts fraud signals into auditable action (case creation, evidence chain-of-custody, compliance reporting)

### 2.2 Insurance Lines Stamped Covers

- Motor Insurance (primary launch line)
- Health Insurance
- Life Insurance
- Home/Property Insurance
- Travel Insurance

### 2.3 Domain Entities the System Must Recognize

When extracting entities and building the knowledge graph, the system must be calibrated to recognize these domain-specific concepts:

**Insurance entities:** insurer, TPA (Third Party Administrator), policyholder, claimant, surveyor, agent, broker, reinsurer, underwriter

**Fraud concepts:** claim fraud, staged accident, garage-surveyor collusion, bill inflation, phantom procedures, policy stacking, non-disclosure, pre-existing damage, duplicate claim, document tampering, identity fraud, organized fraud ring

**Product modules:** Capture Engine, Decision Engine, Document Intelligence Engine, Cost Intelligence Engine, Entity Graph Engine, Investigation Console, Audit & Compliance Layer

**Regulatory entities:** IRDAI (Insurance Regulatory and Development Authority of India), Fraud Monitoring Framework, DPDPA (Digital Personal Data Protection Act), Bima Sugam, risk-based capital framework

**Competitors:** FRISS, Shift Technology, Verisk Analytics, LexisNexis Risk, SAS Institute, Tractable, Medi Assist, Acko, Go Digit, PolicyBazaar

**Market concepts:** loss ratio, gross written premium (GWP), claims leakage, fraud detection rate, entity graph, capture envelope, chain of custody, false positive rate, ACV (annual contract value), ARR (annual recurring revenue), TAM/SAM/SOM

**Key metrics and targets:**
- India insurance fraud leakage: ₹40,000–60,000+ crore/year
- Motor insurance gross premiums: ~$9.4B (2025)
- Fraud detection market CAGR: 26%+ (India)
- Target insurer list: ICICI Lombard, Bajaj Allianz, HDFC ERGO, New India Assurance, Tata AIG, Go Digit, SBI General, Star Health

### 2.4 Stamped's Internal Communication Channels

Primary knowledge sources:
- **Discord** — team discussions, strategy threads, research sharing, decision-making conversations
- **Google Docs / Markdown files** — product specifications, strategy documents, research briefs
- **PDFs** — market research reports, regulatory documents, competitor analyses
- **Uploaded notes** — ad-hoc strategic thinking, meeting notes

---

## SECTION 3 — SYSTEM ARCHITECTURE

### 3.1 Architecture Philosophy

- **Simplicity over complexity** — V1 must be understandable, debuggable, and maintainable by a small team. Avoid premature optimization.
- **Retrieval quality over ingestion volume** — better to ingest less and retrieve accurately than to ingest everything and retrieve noisily.
- **Modularity** — each component (ingestion, processing, storage, retrieval, API) should be independently deployable and testable.
- **Auditability** — every piece of knowledge must be traceable to its source. No orphaned chunks.

### 3.2 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     KNOWLEDGE SOURCES                        │
│  Discord Messages │ Markdown Files │ PDFs │ Google Docs │ Notes │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    INGESTION LAYER                           │
│  File parsers │ Discord scraper │ Metadata extractor         │
│  Chunker │ Preprocessor │ Deduplicator                       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  PROCESSING PIPELINE                         │
│  Embedding generation (text-embedding-3-small)               │
│  Entity extraction │ Relationship extraction                  │
│  Summary generation │ Tag inference                          │
└──────────┬──────────────────┬──────────────────┬────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
│  PostgreSQL  │   │    Qdrant    │   │    Memgraph      │
│  (metadata)  │   │  (vectors)   │   │ (relationships)  │
└──────────────┘   └──────────────┘   └──────────────────┘
           │                  │                  │
           └──────────┬───────┘──────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  RETRIEVAL LAYER                             │
│  Semantic search (Qdrant) │ Graph expansion (Memgraph)       │
│  Metadata filtering (PostgreSQL) │ Context assembly           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI REASONING LAYER                        │
│  GPT-4.1-mini (standard queries)                             │
│  GPT-4.1 (strategic synthesis, complex multi-source queries) │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI BACKEND                           │
│  Ingestion APIs │ Query APIs │ Admin APIs                    │
│  Source attribution │ Conversation management                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (NEXT.JS)                        │
│  Chat interface │ Source browser │ Knowledge graph viewer     │
│  Admin dashboard │ Ingestion status                          │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Technology Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Backend framework | FastAPI | Latest stable | Async, fast, clean API design |
| Primary database | PostgreSQL | 15+ | Metadata, chunk registry, document registry |
| Vector database | Qdrant | Latest stable | Semantic search, embedding storage |
| Graph database | Memgraph | Latest stable | Entity relationships, knowledge graph |
| Embedding model | OpenAI text-embedding-3-small | — | Cost-effective, high quality for V1 |
| Standard AI model | GPT-4.1-mini | — | Retrieval-augmented responses |
| Strategic AI model | GPT-4.1 | — | Complex synthesis, multi-source reasoning |
| Frontend | Next.js 14+ | App Router | React-based, SSR capable |
| Styling | Tailwind CSS | Latest | Utility-first, matches design system |
| Container orchestration | Docker Compose | — | Local dev + staging deployment |
| ORM | SQLAlchemy (async) | 2.0+ | PostgreSQL access |
| Task queue | None (V1) | — | Synchronous ingestion is sufficient for V1 |
| Authentication | Simple token-based (V1) | — | Internal tool only |

---

## SECTION 4 — DESIGN SYSTEM (HARD CONSTRAINTS — NON-NEGOTIABLE)

The frontend must implement Stamped's brand design system precisely. Every UI decision must conform to these rules. This is not aesthetic preference — it is a product requirement.

### 4.1 Brand Identity

The design language is called **"The Immutable Ledger."** It must feel like a high-trust institutional document: precise, warm, authoritative. Think the interior of a private bank or a top-tier legal practice — cream paper, considered structure, a confident accent color used with intention.

**Never:** playful, loud, generic SaaS, startup-gradient, dark-mode.
**Always:** institutional, considered, premium, permanent.

### 4.2 Color Palette (Exact Hex Values — No Substitutions)

```css
/* BACKGROUNDS */
--ground:              #EFEEE7;   /* Page background — ALWAYS this. Never pure white. */
--content:             #F7F6F0;   /* Lighter inset sections, hero zones */
--card:                #EFEEE7;   /* Card backgrounds */
--raised:              #E6E5DC;   /* Hover states, inputs, active surfaces */
--high-raised:         #DDDCD3;   /* Table headers, strong contrast */
--float:               #F7F6F0;   /* Modals, dropdowns */

/* INK (TEXT) */
--ink:                 #2B2C30;   /* Primary text — ALL headings and primary body */
--ink-secondary:       rgba(43,44,48,0.65);   /* Captions, labels */
--ink-dim:             rgba(43,44,48,0.38);   /* Placeholders, disabled */
--ink-ghost:           rgba(43,44,48,0.16);   /* Decorative rules */

/* ACCENT — STAMP ORANGE */
--stamp-orange:        #F75440;   /* PRIMARY ACCENT — CTAs, labels, borders, icons */
--orange-deep:         #C53B26;   /* Hover states, gradient end */
--orange-light:        #FDF0EE;   /* Tinted card backgrounds */
--orange-mid:          #FBDBD7;   /* Chip fills, badge backgrounds */

/* SEMANTIC */
--semantic-verified:   #1E7E34;   /* Verified / success states */
--semantic-review:     #B07800;   /* Review / warning states */
--semantic-rejected:   #F75440;   /* Rejected / error states */
--semantic-info:       #1A6FC4;   /* Informational states */

/* RULES & BORDERS */
--rule:                rgba(43,44,48,0.10);
```

**Stamp Orange (#F75440) usage rules:**
- ✅ CTAs and primary buttons (gradient with Orange Deep)
- ✅ Label eyebrows (ALL CAPS section labels above headings)
- ✅ Active nav items and underlines
- ✅ Left-border callout cards (`border-left: 3px solid #F75440`)
- ✅ Stat unit labels (%, ₹, M, k)
- ✅ Icon fills and strokes
- ✅ Badge and chip borders
- ✅ Input focus rings
- ✅ Section accent dividers
- ❌ NEVER as a full bleed section background
- ❌ NEVER as body copy color
- ❌ NEVER as large background panels

### 4.3 Typography

| Role | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Hero display | Playfair Display | 96px | 700 | Editorial/brand moments ONLY |
| Display LG | Playfair Display | 48px | 700 | Major headings only |
| Display MD | Helvetica Neue | 36px | 700 | Section headings |
| Heading XL | Helvetica Neue | 28px | 700 | Card headings |
| Heading LG | Helvetica Neue | 22px | 600 | Sub-headings |
| Body LG | Helvetica Neue | 16px | 400 | Primary body, line-height 1.7 |
| Body MD | Helvetica Neue | 14px | 400 | Secondary body, line-height 1.65 |
| Body SM | Helvetica Neue | 12px | 400 | Captions |
| Label (eyebrow) | Helvetica Neue | 10px | 700 | ALL CAPS, tracking +0.12em, color `#F75440` |
| Mono | SF Mono / Fira Code | 12px | 400 | Hashes, IDs, timestamps, code |

**Forbidden fonts:** Inter, Roboto, Space Grotesk, Arial, or any system UI font.
**Playfair Display:** Never use for UI text, data, labels, buttons, or inputs.

### 4.4 Spacing System (8pt Grid)

```
s1 = 4px   s2 = 8px   s3 = 12px  s4 = 16px
s5 = 20px  s6 = 24px  s8 = 32px  s10 = 40px
s12 = 48px s16 = 64px s20 = 80px
```

- Page padding: 48px desktop, 24px mobile
- Max content width: 1100px centered
- Body copy max-width: 72ch

### 4.5 Component Specifications

**Primary Button:**
```css
background: linear-gradient(135deg, #F75440, #C53B26);
color: #FFFFFF;
border-radius: 4px;
font: Helvetica Neue 600;
box-shadow: 0 2px 12px rgba(247,84,64,0.28);
```

**Secondary Button:**
```css
background: #EFEEE7;
color: #F75440;
border: 1px solid rgba(247,84,64,0.45);
border-radius: 4px;
font: Helvetica Neue 600;
```

**Card (default):**
```css
background: #EFEEE7;
border-radius: 4px;
border: 1px solid rgba(43,44,48,0.10);
box-shadow: 0 1px 4px rgba(43,44,48,0.06);
```

**Card (hover):**
```css
border: 1px solid rgba(247,84,64,0.40);
box-shadow: 0 2px 8px rgba(43,44,48,0.08);
```

**Input (default):**
```css
background: #E6E5DC;
border: 1px solid rgba(43,44,48,0.14);
border-radius: 4px;
color: #2B2C30;
```

**Input (focus):**
```css
border: 1px solid rgba(247,84,64,0.55);
box-shadow: 0 0 0 3px rgba(247,84,64,0.10);
```

**Callout card:**
```css
background: #F7F6F0;
border-left: 3px solid #F75440;
border-radius: 4px;
```

**Data table:**
```css
/* Header row */
background: #DDDCD3;
font: Helvetica Neue 600, 12px, ALL CAPS;
color: rgba(43,44,48,0.55);
/* Row dividers */
border-bottom: 1px solid rgba(43,44,48,0.08);
/* Highlighted rows */
background: #FDF0EE;
```

**Navigation / Header:**
```css
background: #EFEEE7;
border-bottom: 1px solid rgba(43,44,48,0.10);
/* Active nav item */
color: #F75440;
border-bottom: 2px solid #F75440;
```

**Authenticity Seal (source attribution badge):**
```css
border-radius: 9999px;
background: #FDF0EE;
border: 1px solid rgba(247,84,64,0.35);
/* Contains: colored dot + label (Helvetica 700 ALL CAPS, #2B2C30) + hash (SF Mono) */
```

**Max border-radius on containers: 4px. Never 8px+.**

### 4.6 Hard Don'ts for the Frontend

- ❌ No dark or black page backgrounds
- ❌ No pure white (#FFFFFF) as a page background
- ❌ No pink, purple, teal, or blue outside of semantic use
- ❌ No large orange solid fills covering entire sections
- ❌ No glowing shadows or ambient colored light effects
- ❌ No border-radius >4px on containers
- ❌ No Inter, Roboto, Space Grotesk, or any non-approved font
- ❌ No Playfair Display for UI text, data, labels, or captions
- ❌ No decorative illustrations or stock icons to fill empty space
- ❌ No startup-style gradients, bright color blocking, or hero illustrations

---

## SECTION 5 — DATA MODELS

### 5.1 PostgreSQL Schema

```sql
-- Documents: top-level knowledge artifacts
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL, -- 'discord', 'markdown', 'pdf', 'google_doc', 'note'
    source_id VARCHAR(255),           -- External ID (Discord channel ID, file path, etc.)
    title TEXT,
    author VARCHAR(255),
    channel VARCHAR(255),             -- Discord channel name or doc folder
    url TEXT,                         -- Original URL if applicable
    content_hash VARCHAR(64),         -- SHA-256 for deduplication
    raw_content TEXT,                 -- Original raw content
    summary TEXT,                     -- AI-generated summary
    tags TEXT[],                      -- Inferred topic tags
    word_count INTEGER,
    ingested_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    ingestion_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processed', 'failed'
    metadata JSONB                    -- Source-specific metadata
);

-- Chunks: semantic units for retrieval
CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,     -- Position within document
    chunk_text TEXT NOT NULL,
    embedding_id VARCHAR(255),        -- Qdrant vector ID
    token_count INTEGER,
    metadata JSONB,                   -- Inherited + chunk-specific metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Entities: extracted named entities
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL, -- 'insurer', 'competitor', 'concept', 'person', 'regulation', 'product_module', 'fraud_type'
    description TEXT,
    aliases TEXT[],
    mention_count INTEGER DEFAULT 1,
    first_seen_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- Entity mentions: links entities to specific chunks
CREATE TABLE entity_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES chunks(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    context_snippet TEXT,             -- Surrounding text for context
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Relationships: links between entities (also stored in Memgraph)
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_id UUID REFERENCES entities(id),
    target_entity_id UUID REFERENCES entities(id),
    relationship_type VARCHAR(100),   -- 'competes_with', 'mentioned_alongside', 'related_to', 'part_of'
    confidence FLOAT DEFAULT 1.0,
    evidence_chunk_id UUID REFERENCES chunks(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations: query session management
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- Messages: individual turns in a conversation
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,        -- 'user', 'assistant'
    content TEXT NOT NULL,
    retrieved_chunk_ids UUID[],       -- Which chunks were used
    retrieved_document_ids UUID[],    -- Which documents were cited
    model_used VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ingestion jobs: track batch ingestion operations
CREATE TABLE ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL,    -- 'discord_batch', 'file_upload', 'folder_scan'
    status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed'
    total_items INTEGER,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    error_log TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);
```

### 5.2 Qdrant Collection Schema

**Collection name:** `stamped_chunks`

```json
{
  "collection_name": "stamped_chunks",
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  },
  "payload_schema": {
    "chunk_id": "keyword",
    "document_id": "keyword",
    "source_type": "keyword",
    "channel": "keyword",
    "author": "keyword",
    "tags": "keyword",
    "ingested_at": "datetime",
    "title": "text",
    "chunk_text": "text"
  }
}
```

### 5.3 Memgraph Graph Schema

```cypher
-- Node types
(:Document {id, title, source_type, channel, ingested_at})
(:Entity {id, name, entity_type, description})
(:Concept {id, name, category})

-- Relationship types
(:Entity)-[:MENTIONED_IN]->(:Document)
(:Entity)-[:COMPETES_WITH]->(:Entity)
(:Entity)-[:RELATED_TO]->(:Entity)
(:Entity)-[:PART_OF]->(:Entity)
(:Document)-[:DISCUSSES]->(:Concept)
(:Document)-[:REFERENCES]->(:Document)
(:Concept)-[:CONNECTED_TO]->(:Concept)
```

### 5.4 API Request/Response Models

```python
# Query request
class QueryRequest(BaseModel):
    query: str                          # User's natural language query
    conversation_id: Optional[str]      # For multi-turn conversations
    filters: Optional[QueryFilters]     # Optional metadata filters
    max_sources: int = 5                # Max source documents to cite
    synthesis_level: str = "standard"  # "standard" or "strategic"

class QueryFilters(BaseModel):
    source_types: Optional[List[str]]   # Filter by source type
    channels: Optional[List[str]]       # Filter by Discord channel or doc folder
    date_from: Optional[datetime]
    date_to: Optional[datetime]
    tags: Optional[List[str]]

# Query response
class QueryResponse(BaseModel):
    answer: str                         # AI-generated answer
    sources: List[SourceCitation]       # Source attributions
    conversation_id: str
    model_used: str
    retrieval_metadata: RetrievalMetadata

class SourceCitation(BaseModel):
    document_id: str
    chunk_id: str
    title: str
    source_type: str
    channel: Optional[str]
    author: Optional[str]
    excerpt: str                        # Relevant excerpt from the chunk
    relevance_score: float
    url: Optional[str]

# Ingestion request
class IngestionRequest(BaseModel):
    source_type: str                    # 'file', 'discord_export', 'url', 'text'
    content: Optional[str]             # Raw text content
    file_path: Optional[str]           # Path to file
    metadata: Optional[dict]           # Additional metadata

# Document list response
class DocumentListResponse(BaseModel):
    documents: List[DocumentSummary]
    total: int
    page: int
    page_size: int

class DocumentSummary(BaseModel):
    id: str
    title: str
    source_type: str
    channel: Optional[str]
    author: Optional[str]
    word_count: int
    tags: List[str]
    ingested_at: datetime
    summary: str
```

---

## SECTION 6 — BACKEND SPECIFICATION (FastAPI)

### 6.1 Project Structure

```
stamped-intelligence/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entry point
│   │   ├── config.py                # Environment configuration
│   │   ├── database.py              # PostgreSQL connection (SQLAlchemy async)
│   │   ├── qdrant_client.py         # Qdrant connection and utilities
│   │   ├── memgraph_client.py       # Memgraph connection and utilities
│   │   ├── models/
│   │   │   ├── postgres.py          # SQLAlchemy ORM models
│   │   │   └── schemas.py           # Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── query.py             # Query and conversation endpoints
│   │   │   ├── ingest.py            # Ingestion endpoints
│   │   │   ├── documents.py         # Document management endpoints
│   │   │   ├── entities.py          # Entity management endpoints
│   │   │   └── admin.py             # Admin and status endpoints
│   │   ├── services/
│   │   │   ├── ingestion/
│   │   │   │   ├── chunker.py       # Text chunking logic
│   │   │   │   ├── embedder.py      # Embedding generation
│   │   │   │   ├── extractor.py     # Entity and relationship extraction
│   │   │   │   ├── preprocessor.py  # Text cleaning and normalization
│   │   │   │   └── parsers/
│   │   │   │       ├── pdf_parser.py
│   │   │   │       ├── markdown_parser.py
│   │   │   │       ├── discord_parser.py
│   │   │   │       └── text_parser.py
│   │   │   ├── retrieval/
│   │   │   │   ├── semantic_search.py   # Qdrant vector search
│   │   │   │   ├── graph_expansion.py   # Memgraph context expansion
│   │   │   │   ├── context_assembler.py # Combines search results into context
│   │   │   │   └── reranker.py          # Optional result reranking
│   │   │   └── ai/
│   │   │       ├── query_engine.py      # Main AI reasoning orchestrator
│   │   │       ├── summarizer.py        # Document summarization
│   │   │       └── entity_ai.py         # AI-powered entity extraction
│   │   └── utils/
│   │       ├── text_utils.py
│   │       ├── hash_utils.py
│   │       └── logging.py
│   ├── migrations/                   # Alembic migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/                          # Next.js App Router
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

### 6.2 API Endpoints

#### Query Endpoints (`/api/v1/query`)

```
POST   /api/v1/query                    # Submit a natural language query
GET    /api/v1/conversations            # List all conversations
GET    /api/v1/conversations/{id}       # Get conversation history
DELETE /api/v1/conversations/{id}       # Delete a conversation
```

#### Ingestion Endpoints (`/api/v1/ingest`)

```
POST   /api/v1/ingest/file              # Upload and ingest a single file
POST   /api/v1/ingest/text              # Ingest raw text content
POST   /api/v1/ingest/discord           # Ingest Discord export JSON
POST   /api/v1/ingest/batch             # Batch ingest from a folder path
GET    /api/v1/ingest/jobs              # List ingestion jobs
GET    /api/v1/ingest/jobs/{id}         # Get job status
```

#### Document Endpoints (`/api/v1/documents`)

```
GET    /api/v1/documents                # List all documents (paginated)
GET    /api/v1/documents/{id}           # Get document detail
DELETE /api/v1/documents/{id}           # Remove document and its chunks
GET    /api/v1/documents/{id}/chunks    # Get all chunks for a document
PATCH  /api/v1/documents/{id}           # Update document metadata
```

#### Entity Endpoints (`/api/v1/entities`)

```
GET    /api/v1/entities                 # List all entities
GET    /api/v1/entities/{id}            # Get entity detail with relationships
GET    /api/v1/entities/search          # Search entities by name
GET    /api/v1/entities/{id}/mentions   # Get all mentions of an entity
```

#### Admin Endpoints (`/api/v1/admin`)

```
GET    /api/v1/admin/stats              # System statistics (doc count, chunk count, etc.)
POST   /api/v1/admin/reindex            # Trigger full reindex
GET    /api/v1/admin/health             # Health check for all services
DELETE /api/v1/admin/purge              # Purge all data (dangerous — confirm required)
```

### 6.3 Core Service Logic

#### Chunking Strategy

```python
CHUNKING_CONFIG = {
    "chunk_size": 512,          # tokens
    "chunk_overlap": 64,        # tokens
    "min_chunk_size": 100,      # tokens — discard smaller chunks
    "separator_priority": [
        "\n\n",                 # Paragraph breaks first
        "\n",                   # Line breaks second
        ". ",                   # Sentence breaks third
        " ",                    # Word breaks last
    ]
}
```

For Discord messages:
- Thread messages are chunked together with thread context preserved
- Each message group includes author, timestamp, and channel in metadata
- Consecutive messages from the same author within 5 minutes are merged before chunking

For markdown/PDFs:
- Chunk at paragraph boundaries when possible
- Headings are always included at the start of the chunk they introduce
- Tables are kept as single chunks (not split mid-table)

#### Embedding Generation

```python
async def generate_embedding(text: str) -> List[float]:
    """Generate embedding using text-embedding-3-small."""
    response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding  # 1536 dimensions
```

Batch embedding: process in batches of 100 chunks maximum.

#### Entity Extraction Prompt

The entity extraction service uses GPT-4.1-mini with this system prompt:

```
You are an entity extractor for Stamped, an AI-powered insurance fraud prevention company operating in the Indian insurance market.

Extract all significant entities from the provided text. For each entity, identify:
- name: The entity name as it appears
- type: One of: insurer, competitor, product_module, fraud_type, regulation, market_concept, person, geography, metric, technology
- description: Brief description based on context
- aliases: Any alternative names or abbreviations used

Respond ONLY with a JSON array of entity objects. No preamble.

Focus especially on:
- Insurance companies (ICICI Lombard, Bajaj Allianz, Star Health, etc.)
- Competitors (FRISS, Shift Technology, Tractable, etc.)
- Regulatory bodies (IRDAI, DPDPA, etc.)
- Fraud patterns and types
- Product modules and technical concepts
- Key metrics (loss ratio, fraud rate, ARR, etc.)
```

#### Query Retrieval Flow

```python
async def retrieve_and_answer(query: str, filters: QueryFilters, conversation_history: List) -> QueryResponse:
    # Step 1: Generate query embedding
    query_embedding = await generate_embedding(query)
    
    # Step 2: Semantic search in Qdrant
    semantic_results = await qdrant_search(
        vector=query_embedding,
        filters=build_qdrant_filters(filters),
        limit=20
    )
    
    # Step 3: Extract entities from query
    query_entities = await extract_query_entities(query)
    
    # Step 4: Graph expansion — find related chunks via Memgraph
    related_chunk_ids = await memgraph_expand(
        entities=query_entities,
        seed_chunk_ids=[r.id for r in semantic_results[:5]]
    )
    
    # Step 5: Fetch expanded chunks from PostgreSQL
    all_chunks = await fetch_chunks(
        ids=list(set([r.id for r in semantic_results] + related_chunk_ids))
    )
    
    # Step 6: Rerank and select top chunks
    top_chunks = rerank_chunks(query=query, chunks=all_chunks, limit=8)
    
    # Step 7: Assemble context
    context = assemble_context(chunks=top_chunks, conversation_history=conversation_history)
    
    # Step 8: Select model based on synthesis level
    model = "gpt-4.1" if is_strategic_query(query) else "gpt-4.1-mini"
    
    # Step 9: Generate answer
    answer = await generate_answer(
        query=query,
        context=context,
        model=model,
        conversation_history=conversation_history
    )
    
    return QueryResponse(
        answer=answer,
        sources=build_citations(top_chunks),
        model_used=model
    )
```

#### AI Answer Generation System Prompt

```
You are the Stamped Intelligence System — an internal AI assistant with access to Stamped's complete organizational knowledge base.

Stamped is an AI-powered insurance fraud prevention and operational efficiency platform built for the Indian general insurance market. You understand insurance fraud, the Indian insurance ecosystem, Stamped's product architecture, competitive landscape, and strategic context deeply.

Your job is to answer questions from the Stamped team using ONLY the retrieved context provided. Never hallucinate or invent information not present in the context.

Rules:
1. Answer directly and precisely. Lead with the answer, support with evidence.
2. Always cite your sources by referencing the document title and channel.
3. If the context doesn't contain sufficient information, say so explicitly.
4. For strategic questions, synthesize across multiple sources and note any contradictions.
5. Use Stamped's domain vocabulary naturally (loss ratio, entity graph, capture envelope, etc.)
6. Format responses with clear structure: direct answer → supporting evidence → caveats if any.
7. Never make up competitor data, market figures, or strategic claims not present in the context.

Retrieved context will be provided in the user message. Conversation history is provided for multi-turn context.
```

---

## SECTION 7 — FRONTEND SPECIFICATION (Next.js)

### 7.1 Application Structure

```
frontend/
├── app/
│   ├── layout.tsx                   # Root layout with nav and global styles
│   ├── page.tsx                     # Dashboard / home
│   ├── query/
│   │   └── page.tsx                 # Main query/chat interface
│   ├── documents/
│   │   ├── page.tsx                 # Document browser
│   │   └── [id]/page.tsx            # Document detail view
│   ├── entities/
│   │   ├── page.tsx                 # Entity browser
│   │   └── [id]/page.tsx            # Entity detail with graph
│   ├── ingest/
│   │   └── page.tsx                 # Ingestion interface
│   └── admin/
│       └── page.tsx                 # Admin dashboard
├── components/
│   ├── layout/
│   │   ├── Navigation.tsx
│   │   ├── PageHeader.tsx
│   │   └── SectionLabel.tsx         # Orange ALL CAPS eyebrow label
│   ├── query/
│   │   ├── QueryInput.tsx
│   │   ├── QueryResponse.tsx
│   │   ├── SourceCitation.tsx       # Authenticity seal component
│   │   ├── ConversationHistory.tsx
│   │   └── FilterPanel.tsx
│   ├── documents/
│   │   ├── DocumentCard.tsx
│   │   ├── DocumentList.tsx
│   │   └── ChunkViewer.tsx
│   ├── entities/
│   │   ├── EntityCard.tsx
│   │   ├── EntityGraph.tsx          # Graph visualization
│   │   └── EntityBadge.tsx
│   ├── ingest/
│   │   ├── FileUploader.tsx
│   │   ├── IngestionStatus.tsx
│   │   └── JobTracker.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Badge.tsx
│       ├── DataTable.tsx
│       ├── AuthSeal.tsx             # Authenticity seal (pill badge)
│       ├── StatBlock.tsx            # Metric display with orange units
│       └── CalloutCard.tsx          # Orange left-border callout
```

### 7.2 Page Specifications

#### Dashboard (`/`)

Display:
- System stats in stat blocks: Total Documents, Total Chunks, Total Entities, Queries Today
- Recent ingestion activity (last 5 jobs)
- Recent queries (last 10)
- Quick action buttons: "Ask a Question", "Add Knowledge", "Browse Documents"

Stats format: Large number in charcoal, unit in orange, label in dim ALL CAPS.

#### Query Interface (`/query`)

Layout: Two-column on desktop. Left: conversation history. Right: filter panel (collapsible).

Features:
- Multi-line query input with orange focus ring
- Conversation history with user/assistant message distinction
- Each assistant response includes:
  - Answer text with proper formatting
  - Source citations in authenticity seal format (showing document title, channel, excerpt)
  - Model indicator (Standard / Strategic)
- Filter panel: source type checkboxes, channel multiselect, date range
- Conversation reset button
- "Strategic synthesis" toggle (switches to GPT-4.1)

#### Document Browser (`/documents`)

Layout: Table view with sidebar filters.

Columns: Title | Source Type | Channel | Author | Words | Ingested | Tags

Filters (sidebar): Source type, channel, tag, date range, search by title

Document card on click: Expand to show full summary, tags, all chunks with their text.

#### Entity Browser (`/entities`)

Layout: Grid of entity cards + searchable entity list.

Entity card shows: Name, type badge, mention count, short description.

Entity detail page: Name, type, all mentions with document context, related entities graph (use a simple force-directed graph with D3 or React Flow).

#### Ingestion Interface (`/ingest`)

Tabs: "Upload File" | "Paste Text" | "Discord Export" | "Batch Folder"

Each tab has the appropriate form. Show real-time ingestion progress.

Ingestion job tracker: Table of recent jobs with status, progress bar, error details.

#### Admin Dashboard (`/admin`)

System health panel: PostgreSQL ✅ | Qdrant ✅ | Memgraph ✅ | OpenAI API ✅

Statistics: total documents by source type, total chunks, total entities by type, average query response time.

Danger zone: Reindex All (confirmation required), Purge All Data (double confirmation + type-to-confirm).

---

## SECTION 8 — ENVIRONMENT CONFIGURATION

### 8.1 Required Environment Variables

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=stamped_intelligence
POSTGRES_USER=stamped
POSTGRES_PASSWORD=your_postgres_password
DATABASE_URL=postgresql+asyncpg://stamped:password@localhost:5432/stamped_intelligence

# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=stamped_chunks

# Memgraph
MEMGRAPH_HOST=localhost
MEMGRAPH_PORT=7687
MEMGRAPH_USER=
MEMGRAPH_PASSWORD=

# API
API_SECRET_KEY=your_secret_key_for_internal_auth
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Processing
EMBEDDING_MODEL=text-embedding-3-small
STANDARD_MODEL=gpt-4.1-mini
STRATEGIC_MODEL=gpt-4.1
MAX_TOKENS_ANSWER=2048
CHUNK_SIZE=512
CHUNK_OVERLAP=64
```

### 8.2 Docker Compose Configuration

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: stamped_intelligence
      POSTGRES_USER: stamped
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant_data:/qdrant/storage
    ports:
      - "6333:6333"
      - "6334:6334"

  memgraph:
    image: memgraph/memgraph-platform:latest
    volumes:
      - memgraph_data:/var/lib/memgraph
    ports:
      - "7687:7687"
      - "7444:7444"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      - postgres
      - qdrant
      - memgraph
    volumes:
      - ./backend:/app
      - uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - backend

volumes:
  postgres_data:
  qdrant_data:
  memgraph_data:
  uploads:
```

---

## SECTION 9 — IMPLEMENTATION PHASES

The project is divided into **5 phases**. Build them in order. Each phase must be fully functional, tested, and stable before beginning the next. Do not begin Phase N+1 until Phase N is complete.

---

### PHASE 1 — FOUNDATION & INFRASTRUCTURE
**Goal:** Working project skeleton, all databases running, basic ingestion of text/markdown, basic query working end-to-end.
**Duration estimate:** Week 1–2
**Deliverable:** You can paste text into the system and query it back.

#### Phase 1 Tasks

**1.1 Project Setup**
- Initialize monorepo structure as specified in Section 6.1
- Set up Docker Compose with PostgreSQL, Qdrant, and Memgraph
- Initialize FastAPI backend with async SQLAlchemy
- Initialize Next.js 14 frontend with App Router and Tailwind CSS
- Configure all environment variables
- Set up Alembic for database migrations
- Run migrations to create all PostgreSQL tables (Section 5.1)
- Initialize Qdrant collection with schema from Section 5.2
- Create `.env.example` with all required variables

**1.2 Core Ingestion Pipeline (Text & Markdown only)**
- Implement `preprocessor.py`: text cleaning, normalization, whitespace handling
- Implement `chunker.py`: semantic chunking with the config from Section 6.3
- Implement `embedder.py`: batch embedding generation using text-embedding-3-small
- Implement `text_parser.py` and `markdown_parser.py`
- Implement `POST /api/v1/ingest/text` endpoint
- Implement `POST /api/v1/ingest/file` endpoint (text and .md files only for Phase 1)
- Write ingestion job tracking to PostgreSQL (`ingestion_jobs` table)
- Store documents, chunks, and embeddings end-to-end

**1.3 Basic Query Engine**
- Implement `semantic_search.py`: Qdrant vector search with metadata filtering
- Implement `context_assembler.py`: build context string from top chunks
- Implement `query_engine.py`: call GPT-4.1-mini with assembled context
- Implement `POST /api/v1/query` endpoint (no conversation history yet)
- Return answer + source citations

**1.4 Minimal Frontend**
- Implement navigation bar (brand colors, Helvetica Neue, orange active state)
- Implement query page: input field + response display + basic source citation cards
- Implement ingestion page: file upload form + text paste form
- No styling polish required yet — just functional

**1.5 Health & Admin**
- Implement `GET /api/v1/admin/health` checking all three databases
- Implement `GET /api/v1/admin/stats` with basic counts
- Basic admin page in frontend showing health status

**Phase 1 Exit Criteria:**
- [ ] Docker Compose starts all services without errors
- [ ] Text can be ingested via API and stored in PostgreSQL + Qdrant
- [ ] A markdown file can be uploaded and ingested
- [ ] A natural language query returns a relevant answer with source citations
- [ ] Health check reports all services healthy
- [ ] No hardcoded credentials — all config via environment variables

---

### PHASE 2 — FULL INGESTION PIPELINE & DOCUMENT MANAGEMENT
**Goal:** Ingest all supported source types (PDF, Discord, Google Docs). Build document management UI. Implement deduplication.
**Duration estimate:** Week 2–3
**Deliverable:** The system can ingest real Stamped documents and Discord exports.

#### Phase 2 Tasks

**2.1 PDF Parser**
- Implement `pdf_parser.py` using PyMuPDF (fitz)
- Extract: text content, page structure, embedded headings, tables as text
- Preserve page numbers in metadata
- Handle multi-column layouts gracefully
- Add PDF support to `POST /api/v1/ingest/file`

**2.2 Discord Parser**
- Implement `discord_parser.py` for Discord JSON export format
- Parse: messages, authors, timestamps, channels, threads, replies
- Group messages into conversation threads
- Implement consecutive-message merging (same author within 5 minutes)
- Preserve thread hierarchy in metadata
- Implement `POST /api/v1/ingest/discord` endpoint

**2.3 Deduplication**
- Implement SHA-256 content hashing on ingest
- Check `content_hash` against existing documents before processing
- Return existing document ID if duplicate detected
- Add update path: if content changed (different hash, same source_id), create new version

**2.4 Batch Ingestion**
- Implement `POST /api/v1/ingest/batch` accepting a folder path
- Recursively scan for `.md`, `.txt`, `.pdf` files
- Process each file as an ingestion job
- Report per-file status in the job tracker

**2.5 Document Management API**
- Implement `GET /api/v1/documents` with pagination, filtering, sorting
- Implement `GET /api/v1/documents/{id}` with full chunk list
- Implement `DELETE /api/v1/documents/{id}` — cascade delete chunks from Qdrant + PostgreSQL
- Implement `PATCH /api/v1/documents/{id}` for metadata updates

**2.6 Document Browser UI (Full Implementation)**
- Implement full document browser with table view
- Sortable columns: title, source type, channel, word count, date
- Sidebar filters: source type checkboxes, channel multiselect, tag filter, date range picker, search
- Document detail drawer/page: full metadata + summary + chunk list
- Delete confirmation flow
- Apply full design system (all colors, typography, card styles)

**2.7 Ingestion UI (Full Implementation)**
- File upload tab with drag-and-drop
- Text paste tab with preview
- Discord export upload tab (accepts JSON file)
- Real-time job status updates (polling every 2 seconds)
- Job history table with status badges

**Phase 2 Exit Criteria:**
- [ ] PDF files ingest correctly with proper chunking
- [ ] Discord JSON exports ingest with thread context preserved
- [ ] Duplicate documents are detected and skipped
- [ ] Document browser shows all ingested documents with filtering
- [ ] Documents can be deleted and removed from all three databases
- [ ] Ingestion job tracker shows real-time progress

---

### PHASE 3 — ENTITY EXTRACTION & KNOWLEDGE GRAPH
**Goal:** Extract entities and relationships from ingested content. Build Memgraph graph. Add graph-expanded retrieval. Entity browser UI.
**Duration estimate:** Week 3–4
**Deliverable:** The system understands what its knowledge is about, not just what words are in it.

#### Phase 3 Tasks

**3.1 Entity Extraction Service**
- Implement `entity_ai.py`: GPT-4.1-mini powered entity extraction using the prompt in Section 6.3
- Run entity extraction on every chunk during ingestion
- Store entities in PostgreSQL `entities` table with deduplication (same name + type = same entity)
- Store entity mentions in `entity_mentions` table linking to chunks and documents
- Track `mention_count`, `first_seen_at`, `last_seen_at` per entity

**3.2 Relationship Extraction**
- Implement relationship inference: when two entities appear in the same chunk, create a `MENTIONED_ALONGSIDE` relationship
- Implement specific relationship detection:
  - Competitor relationships: "FRISS competes with Stamped" → `COMPETES_WITH`
  - Hierarchical: "Capture Engine is part of Stamped" → `PART_OF`
  - Regulatory: "IRDAI regulates insurers" → `REGULATES`
- Store in PostgreSQL `relationships` table AND in Memgraph

**3.3 Memgraph Integration**
- Implement `memgraph_client.py` with async Bolt protocol connection
- Implement graph write: create/update nodes and relationships in Memgraph
- Implement graph read: given entity names or chunk IDs, find related entities and chunks
- Implement `graph_expansion.py`: given seed chunk IDs, find connected chunks via shared entities

**3.4 Enhanced Retrieval with Graph Expansion**
- Update query pipeline to include graph expansion step (Section 6.3 retrieval flow)
- Extract entities from incoming queries
- Use entity matches to find additional relevant chunks beyond semantic search
- Merge semantic results + graph-expanded results, rerank, select top 8

**3.5 Document Summarization**
- Implement `summarizer.py`: generate AI summaries for each document at ingestion time
- Store summaries in `documents.summary` field
- Summaries should be 2–4 sentences capturing the document's main purpose and key claims
- Use GPT-4.1-mini for summarization

**3.6 Entity Browser UI**
- Entity list: searchable, filterable by entity type
- Entity cards: name, type badge (color-coded), mention count, description
- Entity detail page:
  - Header: entity name, type, total mentions
  - Mentions table: document title, channel, excerpt, date
  - Related entities section: list of related entities with relationship type
  - Simple graph visualization using React Flow or D3 force-directed layout
- Entity type badges color scheme (semantic colors):
  - insurer: `#1A6FC4` (semantic-info)
  - competitor: `#C53B26` (orange-deep)
  - regulation: `#B07800` (semantic-review)
  - product_module: `#1E7E34` (semantic-verified)
  - fraud_type: `#F75440` (stamp-orange)
  - other: `rgba(43,44,48,0.55)` (ink-dim)

**Phase 3 Exit Criteria:**
- [ ] Entity extraction runs on all ingested documents
- [ ] Entities are stored in PostgreSQL and Memgraph
- [ ] Graph expansion improves query retrieval (verify with test queries)
- [ ] Entity browser shows all extracted entities with filtering
- [ ] Entity detail page shows mentions and related entities
- [ ] Document summaries are generated and displayed

---

### PHASE 4 — CONVERSATIONAL QUERYING & FULL UI POLISH
**Goal:** Multi-turn conversation support. Strategic synthesis mode. Full design system implementation. Source attribution UI.
**Duration estimate:** Week 4–5
**Deliverable:** The system feels like a premium internal AI product that team members will actually use daily.

#### Phase 4 Tasks

**4.1 Conversation Management**
- Implement `conversations` and `messages` tables (already in schema)
- Update `POST /api/v1/query` to accept and return `conversation_id`
- When `conversation_id` is provided, fetch last 10 messages as conversation history
- Include conversation history in the AI context window
- Implement `GET /api/v1/conversations` and `GET /api/v1/conversations/{id}`
- Implement `DELETE /api/v1/conversations/{id}`

**4.2 Strategic Synthesis Mode**
- Implement query classification: detect if a query is "strategic" (multi-source synthesis, market analysis, competitive assessment, decision reconstruction) vs "standard" (fact retrieval, definition, specific document lookup)
- Route strategic queries to GPT-4.1 automatically
- Alternatively, allow users to toggle "Strategic Synthesis" mode manually (forces GPT-4.1)
- Update response to indicate which model was used

**4.3 Query Filtering**
- Implement filter parameter in query API: source_type, channel, date_from, date_to, tags
- Apply filters in Qdrant search payload
- Filter panel in frontend: source type checkboxes, channel multiselect, date range picker

**4.4 Full Query UI (Full Design System Implementation)**
- Conversation history: left-aligned user messages (charcoal text, raised background), right-aligned assistant messages (content background, orange left border)
- Source citations displayed as Authenticity Seal pills below each response
- Each seal shows: colored source-type dot + document title + channel + relevance score
- Click a seal to expand: shows full excerpt, author, date, link to document
- Strategic mode indicator: badge showing "GPT-4.1 Strategic" vs "GPT-4.1-mini Standard"
- Filter sidebar (collapsible on mobile)
- New conversation button
- Conversation history list in left sidebar (desktop only)

**4.5 Full Design System Polish (All Pages)**
Apply the complete design system from Section 4 to every page:
- Every section heading preceded by an orange ALL CAPS eyebrow label
- All cards using exact border, shadow, hover specs
- All buttons using gradient/secondary/ghost specs
- All inputs using specified focus ring
- All tables using header row shading and row dividers
- Navigation with active orange underline
- Stat blocks with charcoal numbers and orange units
- Consistent spacing using the 8pt grid throughout

**4.6 Dashboard (Full Implementation)**
- Stat block row: Documents, Chunks, Entities, Queries This Week — large numbers in charcoal, units in orange
- Recent activity feed: last 10 ingestion events + last 10 queries with source counts
- Quick actions: large CTA cards for "Ask a Question", "Add Knowledge", "Browse Documents", "Browse Entities"
- System health status row (compact, not full admin view)

**Phase 4 Exit Criteria:**
- [ ] Multi-turn conversations work correctly with context preservation
- [ ] Strategic synthesis correctly routes to GPT-4.1 for complex queries
- [ ] Source citation seals display correctly on every query response
- [ ] Design system fully applied to all pages (visual QA against Section 4 spec)
- [ ] Filter panel correctly narrows retrieval results
- [ ] Conversation history persists across browser sessions

---

### PHASE 5 — PRODUCTION HARDENING, TESTING & OBSERVABILITY
**Goal:** The system is reliable, observable, and ready for daily team use. Error handling is comprehensive. Performance is acceptable. Documentation is complete.
**Duration estimate:** Week 5–6
**Deliverable:** A system that can be deployed and relied upon by the Stamped team.

#### Phase 5 Tasks

**5.1 Error Handling & Resilience**
- All API endpoints return consistent error response format:
  ```json
  {"error": "error_code", "message": "Human readable message", "details": {}}
  ```
- Ingestion failures: log to `ingestion_jobs.error_log`, mark job as failed, continue with next item
- OpenAI API errors: implement exponential backoff retry (3 attempts, 1s/2s/4s)
- Qdrant connection errors: health check on startup, graceful degradation
- Database connection pooling: configure SQLAlchemy pool size (10 connections)
- Input validation: all API inputs validated with Pydantic, clear error messages returned

**5.2 Performance Optimization**
- Embedding generation: batch all chunks from a document into a single OpenAI API call
- Qdrant search: tune `hnsw_config` for the expected collection size
- PostgreSQL: add indexes on frequently queried columns:
  ```sql
  CREATE INDEX idx_chunks_document_id ON chunks(document_id);
  CREATE INDEX idx_entity_mentions_entity_id ON entity_mentions(entity_id);
  CREATE INDEX idx_documents_source_type ON documents(source_type);
  CREATE INDEX idx_documents_ingested_at ON documents(ingested_at DESC);
  CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
  ```
- Frontend: implement debouncing on search inputs (300ms)
- Frontend: paginate document and entity lists (50 items per page)

**5.3 Logging & Observability**
- Structured logging throughout backend using Python `logging` with JSON format
- Log every query: query text (truncated), model used, chunks retrieved, response time
- Log every ingestion: document ID, chunk count, entity count, processing time
- Log all errors with full stack traces
- Implement `GET /api/v1/admin/stats` with:
  - Document count by source type
  - Chunk count total
  - Entity count by type
  - Relationship count
  - Ingestion jobs: success/failure counts by day (last 7 days)
  - Query count by day (last 7 days)
  - Average query response time (last 7 days)

**5.4 Authentication (Simple Internal Token)**
- Implement simple API key middleware for all routes
- API key stored in environment variable `API_SECRET_KEY`
- Frontend stores API key in localStorage (this is an internal tool — HTTPS in production is sufficient)
- No user accounts, no OAuth, no sessions — single shared key for V1

**5.5 Testing**
- Write integration tests for critical paths:
  - Ingest text → verify chunk in Qdrant + PostgreSQL
  - Ingest PDF → verify parsing and chunk count
  - Query → verify response contains answer and source citations
  - Delete document → verify cascade removal from Qdrant
- Write unit tests for:
  - `chunker.py`: verify chunk sizes and overlap
  - `preprocessor.py`: verify text cleaning
  - `discord_parser.py`: verify message grouping and thread handling
- Test Discord JSON export format (test with a sample export)

**5.6 Documentation**
Create a `README.md` at project root covering:
- Architecture overview (link to Section 3 diagram)
- Prerequisites (Docker, Docker Compose, OpenAI API key)
- Setup instructions (step by step from clone to running)
- Environment variable reference (every variable, what it does, example value)
- API reference (every endpoint, request/response examples)
- How to ingest Discord exports
- How to ingest files
- How to query the system
- Troubleshooting common issues (Qdrant not connecting, OpenAI rate limits, etc.)

**5.7 Deployment Configuration**
- Production Docker Compose with resource limits
- Nginx reverse proxy config (if deploying to a VM)
- Volume backup script for PostgreSQL, Qdrant, and Memgraph data
- `Makefile` with common commands:
  ```makefile
  make setup     # First-time setup, create .env, run migrations
  make up        # Start all services
  make down      # Stop all services
  make logs      # Tail all service logs
  make backup    # Backup all persistent data
  make test      # Run test suite
  make shell-api # Open bash in backend container
  ```

**Phase 5 Exit Criteria:**
- [ ] All API errors return consistent, informative error responses
- [ ] OpenAI API failures retry with backoff and don't crash the system
- [ ] All critical paths have integration tests that pass
- [ ] Admin stats page shows accurate system metrics
- [ ] README is complete and a new developer can set up the system from scratch in under 30 minutes
- [ ] Makefile commands all work correctly
- [ ] System handles 50 concurrent query requests without degrading

---

## SECTION 10 — CROSS-CUTTING REQUIREMENTS

These apply to every phase and every component.

### 10.1 Code Quality

- Use type hints on all Python functions
- Use TypeScript (strict mode) in all frontend files
- No `any` types in TypeScript without explicit justification comment
- Maximum function length: 50 lines. If longer, extract sub-functions.
- Every external API call (OpenAI, Qdrant, Memgraph) wrapped in try/catch
- No secrets in code — all configuration via environment variables
- All async operations properly awaited
- No silent failures — every exception either handled or logged

### 10.2 Security

- Sanitize all user inputs before storing
- No raw SQL string concatenation — use SQLAlchemy parameterized queries
- Rate limiting on query endpoint: 30 requests per minute per token
- File upload size limit: 50MB
- Accepted file types for upload: `.txt`, `.md`, `.pdf`, `.json` only

### 10.3 Data Integrity

- Every chunk must have a corresponding document record
- Deleting a document cascades to: chunks (PostgreSQL), vectors (Qdrant), entity mentions (PostgreSQL), relationships (PostgreSQL + Memgraph)
- Content hashing prevents duplicate ingestion
- Ingestion jobs are atomic: either the entire document ingests or it fails cleanly with error logged

### 10.4 Frontend Accessibility

- All interactive elements have keyboard focus states
- Focus states use the orange focus ring: `box-shadow: 0 0 0 3px rgba(247,84,64,0.10)`
- Color is never the only indicator of meaning (always pair with text or icon)
- All images (if any) have alt text
- Respect `prefers-reduced-motion` in all animations

---

## SECTION 11 — SAMPLE QUERIES THE SYSTEM MUST ANSWER WELL

Use these as acceptance test cases to validate retrieval quality across phases:

1. "What insights did we gather from competitor research on fraud detection?"
2. "What discussions did we have around how to approach the motor insurance launch?"
3. "Summarize everything we know about FRISS and how it compares to Stamped."
4. "What are the key risks identified for Stamped and how are we planning to mitigate them?"
5. "What is the ROI model for a mid-tier insurer using Stamped?"
6. "Why did we decide to position Stamped as infrastructure rather than a point solution?"
7. "What is the IRDAI Fraud Monitoring Framework and how does Stamped address it?"
8. "What is the current thinking on pricing for large vs small insurers?"
9. "Summarize all discussions related to the entity graph and its competitive moat."
10. "What is the go-to-market strategy for health insurance?"

---

## SECTION 12 — WHAT CURSOR SHOULD NOT DO

- Do not use any alternative component libraries (shadcn, Material UI, Chakra, etc.) — build from primitives using Tailwind
- Do not use any colors not in the design palette
- Do not use Inter, Roboto, or any non-approved font
- Do not use `localStorage` for sensitive data (API responses, document content)
- Do not implement features not in this spec without explicit approval
- Do not use Redis, RabbitMQ, Celery, or any async task queue in V1
- Do not implement real-time WebSocket connections in V1 (polling is sufficient)
- Do not implement multi-user authentication or role-based access in V1
- Do not implement GitHub ingestion in V1
- Do not use Pinecone, Weaviate, or any vector database other than Qdrant
- Do not use LangChain or LlamaIndex — implement all retrieval logic directly

---

## SECTION 13 — FINAL NOTES FOR CURSOR

You are building for a startup that takes design and product quality seriously. The system must be fast, clean, and feel premium. Every component should reflect the "Immutable Ledger" aesthetic described in Section 4.

When in doubt about implementation details not specified here, choose the simpler approach. Stamped values understandable, maintainable code over clever abstractions.

The most important user flow is: **ingest a document → query about it → get a precise, sourced answer**. Everything else is supporting infrastructure for that core loop.

Start with Phase 1. Build it completely. Test it. Then proceed.

---

*Stamped Intelligence System — Cursor Build Prompt v1.0 | April 2026 | Internal Use Only*
