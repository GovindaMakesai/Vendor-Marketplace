import bcrypt from "bcryptjs";
import { PrismaClient, type DocumentStatus, type DocumentType, type RequirementPriority } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "admin@demo.vendor.local";
const DEMO_PASSWORD = "DemoAdmin#2026";

function daysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

type DemoDocument = {
  documentType: DocumentType;
  documentNumber: string;
  status: DocumentStatus;
  expiryDays: number;
  notes: string;
};

type DemoVendor = {
  name: string;
  vendorType: string;
  category: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  rating: number;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  documents: DemoDocument[];
};

const vendors: DemoVendor[] = [
  {
    name: "Harbour Electric Co",
    vendorType: "Contractor",
    category: "Electrical",
    description: "Demo electrical contractor for commercial switchboards and maintenance in Sydney.",
    email: "harbour.electric@demo.vendor.local",
    phone: "+61 2 5550 1001",
    address: "10 Demo Wharf Road",
    city: "Sydney",
    state: "New South Wales",
    country: "Australia",
    rating: 4.8,
    status: "ACTIVE",
    documents: [
      { documentType: "TAX_REGISTRATION", documentNumber: "TAX-HE-1001", status: "VALID", expiryDays: 400, notes: "Demo tax registration" },
      { documentType: "INSURANCE", documentNumber: "INS-HE-1001", status: "VALID", expiryDays: 20, notes: "Demo insurance nearing expiry" },
      { documentType: "TRADE_LICENSE", documentNumber: "LIC-HE-1001", status: "VALID", expiryDays: 500, notes: "Demo trade license" },
      { documentType: "SAFETY_CERTIFICATE", documentNumber: "SAF-HE-1001", status: "VALID", expiryDays: 300, notes: "Demo safety certificate" },
    ],
  },
  {
    name: "Metro Spark Services",
    vendorType: "Contractor",
    category: "Electrical",
    description: "Demo electrical maintenance vendor operating across inner Sydney.",
    email: "metro.spark@demo.vendor.local",
    phone: "+61 2 5550 1002",
    address: "44 Demo George Street",
    city: "Sydney",
    state: "New South Wales",
    country: "Australia",
    rating: 4.2,
    status: "ACTIVE",
    documents: [
      { documentType: "TAX_REGISTRATION", documentNumber: "TAX-MS-1002", status: "VALID", expiryDays: 360, notes: "Demo tax registration" },
      { documentType: "INSURANCE", documentNumber: "INS-MS-1002", status: "VALID", expiryDays: 280, notes: "Demo insurance" },
      { documentType: "TRADE_LICENSE", documentNumber: "LIC-MS-1002", status: "VALID", expiryDays: 420, notes: "Demo trade license" },
    ],
  },
  {
    name: "Hunter Grid Co",
    vendorType: "Contractor",
    category: "Electrical",
    description: "Demo regional electrical vendor based in Newcastle.",
    email: "hunter.grid@demo.vendor.local",
    phone: "+61 2 5550 1003",
    address: "8 Demo Hunter Street",
    city: "Newcastle",
    state: "New South Wales",
    country: "Australia",
    rating: 3.9,
    status: "ACTIVE",
    documents: [
      { documentType: "INSURANCE", documentNumber: "INS-HG-1003", status: "VALID", expiryDays: 240, notes: "Demo insurance" },
      { documentType: "TRADE_LICENSE", documentNumber: "LIC-HG-1003", status: "VALID", expiryDays: 240, notes: "Demo trade license" },
      { documentType: "SAFETY_CERTIFICATE", documentNumber: "SAF-HG-1003", status: "EXPIRED", expiryDays: -30, notes: "Demo expired safety certificate" },
    ],
  },
  {
    name: "Pacific Civil Group",
    vendorType: "Contractor",
    category: "Civil",
    description: "Demo civil works vendor for stations, platforms, and public realm projects.",
    email: "pacific.civil@demo.vendor.local",
    phone: "+61 3 5550 2001",
    address: "90 Demo Collins Street",
    city: "Melbourne",
    state: "Victoria",
    country: "Australia",
    rating: 4.6,
    status: "ACTIVE",
    documents: [
      { documentType: "TAX_REGISTRATION", documentNumber: "TAX-PC-2001", status: "VALID", expiryDays: 500, notes: "Demo tax registration" },
      { documentType: "INSURANCE", documentNumber: "INS-PC-2001", status: "VALID", expiryDays: 300, notes: "Demo insurance" },
      { documentType: "TRADE_LICENSE", documentNumber: "LIC-PC-2001", status: "VALID", expiryDays: 450, notes: "Demo trade license" },
    ],
  },
  {
    name: "Southern Civil Works",
    vendorType: "Contractor",
    category: "Civil",
    description: "Demo civil contractor with a pending insurance review.",
    email: "southern.civil@demo.vendor.local",
    phone: "+61 3 5550 2002",
    address: "15 Demo Spencer Street",
    city: "Melbourne",
    state: "Victoria",
    country: "Australia",
    rating: 3.4,
    status: "ACTIVE",
    documents: [
      { documentType: "TAX_REGISTRATION", documentNumber: "TAX-SC-2002", status: "VALID", expiryDays: 300, notes: "Demo tax registration" },
      { documentType: "INSURANCE", documentNumber: "INS-SC-2002", status: "PENDING", expiryDays: 200, notes: "Demo insurance pending review" },
      { documentType: "TRADE_LICENSE", documentNumber: "LIC-SC-2002", status: "VALID", expiryDays: 260, notes: "Demo trade license" },
    ],
  },
  {
    name: "Reef Air Systems",
    vendorType: "Specialist",
    category: "HVAC",
    description: "Demo HVAC specialist for hospitals and commercial plant in Brisbane.",
    email: "reef.air@demo.vendor.local",
    phone: "+61 7 5550 3001",
    address: "22 Demo Creek Street",
    city: "Brisbane",
    state: "Queensland",
    country: "Australia",
    rating: 4.9,
    status: "ACTIVE",
    documents: [
      { documentType: "TAX_REGISTRATION", documentNumber: "TAX-RA-3001", status: "VALID", expiryDays: 400, notes: "Demo tax registration" },
      { documentType: "INSURANCE", documentNumber: "INS-RA-3001", status: "VALID", expiryDays: 320, notes: "Demo insurance" },
      { documentType: "TRADE_LICENSE", documentNumber: "LIC-RA-3001", status: "VALID", expiryDays: 380, notes: "Demo trade license" },
    ],
  },
  {
    name: "Coast HVAC Partners",
    vendorType: "Specialist",
    category: "HVAC",
    description: "Demo HVAC vendor based on the Gold Coast, in the same state as Brisbane.",
    email: "coast.hvac@demo.vendor.local",
    phone: "+61 7 5550 3002",
    address: "5 Demo Cavill Avenue",
    city: "Gold Coast",
    state: "Queensland",
    country: "Australia",
    rating: 4.1,
    status: "ACTIVE",
    documents: [
      { documentType: "TAX_REGISTRATION", documentNumber: "TAX-CH-3002", status: "VALID", expiryDays: 280, notes: "Demo tax registration" },
      { documentType: "INSURANCE", documentNumber: "INS-CH-3002", status: "VALID", expiryDays: 190, notes: "Demo insurance" },
      { documentType: "TRADE_LICENSE", documentNumber: "LIC-CH-3002", status: "VALID", expiryDays: 210, notes: "Demo trade license" },
    ],
  },
  {
    name: "Nullarbor Freight",
    vendorType: "Logistics",
    category: "Logistics",
    description: "Demo freight vendor with strong ratings and an expired insurance record.",
    email: "nullarbor.freight@demo.vendor.local",
    phone: "+61 8 5550 4001",
    address: "70 Demo Wellington Street",
    city: "Perth",
    state: "Western Australia",
    country: "Australia",
    rating: 4.7,
    status: "ACTIVE",
    documents: [
      { documentType: "TAX_REGISTRATION", documentNumber: "TAX-NF-4001", status: "VALID", expiryDays: 300, notes: "Demo tax registration" },
      { documentType: "INSURANCE", documentNumber: "INS-NF-4001", status: "EXPIRED", expiryDays: -45, notes: "Demo expired insurance" },
      { documentType: "TRADE_LICENSE", documentNumber: "LIC-NF-4001", status: "VALID", expiryDays: 260, notes: "Demo trade license" },
    ],
  },
  {
    name: "Westline Logistics",
    vendorType: "Logistics",
    category: "Logistics",
    description: "Demo logistics vendor with complete documents and a low rating.",
    email: "westline.logistics@demo.vendor.local",
    phone: "+61 8 5550 4002",
    address: "3 Demo Hay Street",
    city: "Perth",
    state: "Western Australia",
    country: "Australia",
    rating: 2.1,
    status: "ACTIVE",
    documents: [
      { documentType: "TAX_REGISTRATION", documentNumber: "TAX-WL-4002", status: "VALID", expiryDays: 340, notes: "Demo tax registration" },
      { documentType: "INSURANCE", documentNumber: "INS-WL-4002", status: "VALID", expiryDays: 220, notes: "Demo insurance" },
      { documentType: "TRADE_LICENSE", documentNumber: "LIC-WL-4002", status: "VALID", expiryDays: 250, notes: "Demo trade license" },
    ],
  },
  {
    name: "Adelaide Pipe & Co",
    vendorType: "Contractor",
    category: "Plumbing",
    description: "Demo plumbing vendor missing a trade license record.",
    email: "adelaide.pipe@demo.vendor.local",
    phone: "+61 8 5550 5001",
    address: "18 Demo King William Street",
    city: "Adelaide",
    state: "South Australia",
    country: "Australia",
    rating: 4.4,
    status: "ACTIVE",
    documents: [
      { documentType: "TAX_REGISTRATION", documentNumber: "TAX-AP-5001", status: "VALID", expiryDays: 310, notes: "Demo tax registration" },
      { documentType: "INSURANCE", documentNumber: "INS-AP-5001", status: "VALID", expiryDays: 180, notes: "Demo insurance" },
      { documentType: "AGREEMENT", documentNumber: "AGR-AP-5001", status: "PENDING", expiryDays: 90, notes: "Demo agreement pending signature" },
    ],
  },
  {
    name: "Dark Harbour Electric",
    vendorType: "Contractor",
    category: "Electrical",
    description: "Demo electrical vendor that is inactive and must be excluded from recommendations.",
    email: "dark.harbour@demo.vendor.local",
    phone: "+61 2 5550 1009",
    address: "1 Demo Inactive Lane",
    city: "Sydney",
    state: "New South Wales",
    country: "Australia",
    rating: 5,
    status: "INACTIVE",
    documents: [
      { documentType: "TAX_REGISTRATION", documentNumber: "TAX-DH-1009", status: "VALID", expiryDays: 400, notes: "Demo tax registration" },
      { documentType: "INSURANCE", documentNumber: "INS-DH-1009", status: "VALID", expiryDays: 400, notes: "Demo insurance" },
      { documentType: "TRADE_LICENSE", documentNumber: "LIC-DH-1009", status: "VALID", expiryDays: 400, notes: "Demo trade license" },
    ],
  },
  {
    name: "Holdfast Safety",
    vendorType: "Consultant",
    category: "Safety",
    description: "Demo safety consultant that is suspended and must be excluded from recommendations.",
    email: "holdfast.safety@demo.vendor.local",
    phone: "+61 2 5550 6001",
    address: "12 Demo Suspended Street",
    city: "Sydney",
    state: "New South Wales",
    country: "Australia",
    rating: 4.5,
    status: "SUSPENDED",
    documents: [
      { documentType: "TAX_REGISTRATION", documentNumber: "TAX-HS-6001", status: "VALID", expiryDays: 200, notes: "Demo tax registration" },
      { documentType: "INSURANCE", documentNumber: "INS-HS-6001", status: "REJECTED", expiryDays: 200, notes: "Demo rejected insurance" },
      { documentType: "TRADE_LICENSE", documentNumber: "LIC-HS-6001", status: "VALID", expiryDays: 200, notes: "Demo trade license" },
    ],
  },
];

const requirements: Array<{
  title: string;
  description: string;
  category: string;
  location: string;
  estimatedValue: number;
  priority: RequirementPriority;
  startInDays: number;
}> = [
  {
    title: "Sydney CBD switchboard upgrade",
    description: "Demo requirement for an electrical contractor in Sydney with current compliance records.",
    category: "Electrical",
    location: "Sydney",
    estimatedValue: 185000,
    priority: "HIGH",
    startInDays: 30,
  },
  {
    title: "Melbourne platform civil works",
    description: "Demo civil requirement for station platform works in Melbourne.",
    category: "Civil",
    location: "Melbourne",
    estimatedValue: 940000,
    priority: "CRITICAL",
    startInDays: 45,
  },
  {
    title: "Brisbane hospital HVAC retrofit",
    description: "Demo HVAC requirement comparing a Brisbane vendor with a same-state Gold Coast vendor.",
    category: "HVAC",
    location: "Brisbane",
    estimatedValue: 420000,
    priority: "HIGH",
    startInDays: 21,
  },
  {
    title: "Perth distribution centre logistics",
    description: "Demo logistics requirement that contrasts a low rating with an expired insurance record.",
    category: "Logistics",
    location: "Perth",
    estimatedValue: 150000,
    priority: "MEDIUM",
    startInDays: 14,
  },
  {
    title: "Adelaide civic centre plumbing",
    description: "Demo plumbing requirement where the local vendor is missing a required trade license.",
    category: "Plumbing",
    location: "Adelaide",
    estimatedValue: 86000,
    priority: "MEDIUM",
    startInDays: 28,
  },
  {
    title: "Regional electrical inspection",
    description: "Demo requirement located at state level so New South Wales vendors receive a partial location score.",
    category: "Electrical",
    location: "New South Wales",
    estimatedValue: 45000,
    priority: "LOW",
    startInDays: 60,
  },
];

async function main() {
  await prisma.recommendation.deleteMany();
  await prisma.vendorDocument.deleteMany();
  await prisma.workRequirement.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const admin = await prisma.user.create({
    data: {
      name: "Demo Administrator",
      email: DEMO_EMAIL,
      passwordHash,
      role: "ADMIN",
    },
  });

  for (const vendor of vendors) {
    await prisma.vendor.create({
      data: {
        name: vendor.name,
        vendorType: vendor.vendorType,
        category: vendor.category,
        description: vendor.description,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        city: vendor.city,
        state: vendor.state,
        country: vendor.country,
        rating: vendor.rating,
        status: vendor.status,
        documents: {
          create: vendor.documents.map((document) => ({
            documentType: document.documentType,
            documentNumber: document.documentNumber,
            issuedDate: daysFromNow(-200),
            expiryDate: daysFromNow(document.expiryDays),
            status: document.status,
            fileName: `${document.documentNumber}.pdf`,
            notes: document.notes,
          })),
        },
      },
    });
  }

  for (const requirement of requirements) {
    await prisma.workRequirement.create({
      data: {
        title: requirement.title,
        description: requirement.description,
        category: requirement.category,
        location: requirement.location,
        estimatedValue: requirement.estimatedValue,
        priority: requirement.priority,
        expectedStartDate: daysFromNow(requirement.startInDays),
        status: "OPEN",
        createdById: admin.id,
      },
    });
  }

  const documentCount = vendors.reduce((total, vendor) => total + vendor.documents.length, 0);
  console.log(`Seeded demo data: 1 user, ${vendors.length} vendors, ${documentCount} documents, ${requirements.length} work requirements.`);
  console.log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
