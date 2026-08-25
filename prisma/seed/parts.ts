import { balanceOf, postTransaction } from "../../lib/escrow/ledger";
import { planPurchase, priceCart } from "../../lib/store/purchase";
import type { PrismaClient } from "../../lib/generated/prisma/client";
import type { EquipmentCategory, PartCategory } from "../../lib/generated/prisma/enums";
import { rng } from "./history";

/**
 * Parts & service store stock.
 *
 * Prices are whole tugrik at roughly Ulaanbaatar import parity, and every part
 * declares what it fits — an empty `compatibleWith` means universal, which is
 * what the catalogue filter reads as "fits all machines". Consumables are
 * deliberately cheap and plentiful so a demo cart can be built in two clicks.
 */

type PartSeed = {
  sku: string;
  nameMn: string;
  nameEn: string;
  descriptionMn: string;
  descriptionEn: string;
  category: PartCategory;
  price: number;
  stock: number;
  unit: string;
  compatibleWith: EquipmentCategory[];
};

export const PARTS: PartSeed[] = [
  {
    sku: "TR-FL-1001",
    nameMn: "Хөдөлгүүрийн тосны шүүлтүүр",
    nameEn: "Engine oil filter",
    descriptionMn: "CAT 320D, Komatsu PC200 зэрэг экскаваторт тохирно.",
    descriptionEn: "Fits CAT 320D, Komatsu PC200 and similar excavators.",
    category: "FILTER",
    price: 68_000,
    stock: 120,
    unit: "pcs",
    compatibleWith: ["EXCAVATOR", "LOADER", "BULLDOZER"],
  },
  {
    sku: "TR-FL-1002",
    nameMn: "Түлшний шүүлтүүрийн иж бүрдэл",
    nameEn: "Fuel filter kit",
    descriptionMn: "Үндсэн болон салгагч шүүлтүүр хамт. 500 цаг тутам солино.",
    descriptionEn: "Primary and separator filters together. Replace every 500 hours.",
    category: "FILTER",
    price: 145_000,
    stock: 64,
    unit: "set",
    compatibleWith: ["EXCAVATOR", "TRUCK", "GRADER", "ROLLER"],
  },
  {
    sku: "TR-FL-1003",
    nameMn: "Агаарын шүүлтүүр",
    nameEn: "Air filter element",
    descriptionMn: "Говийн тоос шороонд тэсвэртэй хоёр давхар элемент.",
    descriptionEn: "Two-stage element built for Gobi dust.",
    category: "FILTER",
    price: 92_000,
    stock: 78,
    unit: "pcs",
    compatibleWith: [],
  },
  {
    sku: "TR-FL-1004",
    nameMn: "Гидравликийн буцах шүүлтүүр",
    nameEn: "Hydraulic return filter",
    descriptionMn: "Гидравлик системийн бохирдлыг барих үндсэн шүүлтүүр.",
    descriptionEn: "Main return-line filter for the hydraulic circuit.",
    category: "FILTER",
    price: 178_000,
    stock: 41,
    unit: "pcs",
    compatibleWith: ["EXCAVATOR", "CRANE", "LOADER"],
  },
  {
    sku: "TR-HY-2001",
    nameMn: "Гидравлик насос",
    nameEn: "Hydraulic main pump",
    descriptionMn: "Сэргээн засварласан, 6 сарын баталгаатай үндсэн насос.",
    descriptionEn: "Remanufactured main pump with a six-month warranty.",
    category: "HYDRAULICS",
    price: 4_850_000,
    stock: 4,
    unit: "pcs",
    compatibleWith: ["EXCAVATOR"],
  },
  {
    sku: "TR-HY-2002",
    nameMn: "Сумны цилиндрийн битүүмжийн иж бүрдэл",
    nameEn: "Boom cylinder seal kit",
    descriptionMn: "Тос алдалт үүссэн үед солих бүрэн иж бүрдэл.",
    descriptionEn: "Complete kit for a cylinder that has started weeping.",
    category: "HYDRAULICS",
    price: 385_000,
    stock: 26,
    unit: "set",
    compatibleWith: ["EXCAVATOR", "LOADER", "CRANE"],
  },
  {
    sku: "TR-HY-2003",
    nameMn: "Өндөр даралтын хоолой",
    nameEn: "High-pressure hydraulic hose",
    descriptionMn: "2 давхар торлолт, 2 метр урт, холбогчтой.",
    descriptionEn: "Two-wire braid, 2 m, fittings included.",
    category: "HYDRAULICS",
    price: 165_000,
    stock: 90,
    unit: "pcs",
    compatibleWith: [],
  },
  {
    sku: "TR-UC-3001",
    nameMn: "Гинжний хэлхээ",
    nameEn: "Track chain assembly",
    descriptionMn: "20 тонны экскаваторын гинж, хайрцагтай нийлүүлнэ.",
    descriptionEn: "Track chain for 20-tonne excavators, shoes included.",
    category: "UNDERCARRIAGE",
    price: 6_450_000,
    stock: 3,
    unit: "pcs",
    compatibleWith: ["EXCAVATOR", "BULLDOZER"],
  },
  {
    sku: "TR-UC-3002",
    nameMn: "Тулгуур дугуй",
    nameEn: "Track roller",
    descriptionMn: "Доод тулгуур дугуй, битүүмжлэгдсэн подшипниктэй.",
    descriptionEn: "Bottom roller with sealed bearings.",
    category: "UNDERCARRIAGE",
    price: 520_000,
    stock: 34,
    unit: "pcs",
    compatibleWith: ["EXCAVATOR", "BULLDOZER", "DRILL_RIG"],
  },
  {
    sku: "TR-UC-3003",
    nameMn: "Хөтлөгч од",
    nameEn: "Drive sprocket",
    descriptionMn: "Хатууруулсан ган, элэгдэлд тэсвэртэй.",
    descriptionEn: "Hardened steel, built to resist wear.",
    category: "UNDERCARRIAGE",
    price: 1_180_000,
    stock: 9,
    unit: "pcs",
    compatibleWith: ["EXCAVATOR", "BULLDOZER"],
  },
  {
    sku: "TR-EN-4001",
    nameMn: "Турбо цэнэглэгч",
    nameEn: "Turbocharger",
    descriptionMn: "Шинэ турбо, тохируулгын хамт нийлүүлнэ.",
    descriptionEn: "New turbo supplied with its actuator.",
    category: "ENGINE",
    price: 3_250_000,
    stock: 5,
    unit: "pcs",
    compatibleWith: ["EXCAVATOR", "TRUCK", "LOADER", "GRADER"],
  },
  {
    sku: "TR-EN-4002",
    nameMn: "Шахагчийн бүслүүрийн иж бүрдэл",
    nameEn: "Injector seal set",
    descriptionMn: "Шахагч буулгаж угсрах бүрд солих зөөлөвч, битүүмж.",
    descriptionEn: "Seals and washers to replace whenever injectors come out.",
    category: "ENGINE",
    price: 210_000,
    stock: 47,
    unit: "set",
    compatibleWith: [],
  },
  {
    sku: "TR-EN-4003",
    nameMn: "Хөргөлтийн шингэний насос",
    nameEn: "Water pump",
    descriptionMn: "Хөргөлтийн систем халалт өгч эхэлсэн үед солино.",
    descriptionEn: "Replace when the cooling system starts running hot.",
    category: "ENGINE",
    price: 690_000,
    stock: 12,
    unit: "pcs",
    compatibleWith: ["EXCAVATOR", "TRUCK", "CONCRETE_MIXER"],
  },
  {
    sku: "TR-EL-5001",
    nameMn: "Аккумулятор 12V 200Ah",
    nameEn: "Battery 12V 200Ah",
    descriptionMn: "Хүйтэнд асах чадвар өндөртэй, -40°C-д ажиллана.",
    descriptionEn: "High cold-cranking amps, rated to −40 °C.",
    category: "ELECTRICAL",
    price: 780_000,
    stock: 22,
    unit: "pcs",
    compatibleWith: [],
  },
  {
    sku: "TR-EL-5002",
    nameMn: "Асаагуур мотор",
    nameEn: "Starter motor",
    descriptionMn: "Сэргээн засварласан, 12 сарын баталгаатай.",
    descriptionEn: "Remanufactured, twelve-month warranty.",
    category: "ELECTRICAL",
    price: 1_150_000,
    stock: 7,
    unit: "pcs",
    compatibleWith: ["EXCAVATOR", "TRUCK", "LOADER", "BULLDOZER"],
  },
  {
    sku: "TR-EL-5003",
    nameMn: "LED ажлын гэрэл",
    nameEn: "LED work light",
    descriptionMn: "60W, цутгамал их биетэй, шороо тоосонд тэсвэртэй.",
    descriptionEn: "60 W, cast housing, sealed against dust.",
    category: "ELECTRICAL",
    price: 96_000,
    stock: 140,
    unit: "pcs",
    compatibleWith: [],
  },
  {
    sku: "TR-TR-6001",
    nameMn: "Ачигчийн дугуй 20.5R25",
    nameEn: "Loader tire 20.5R25",
    descriptionMn: "Хайрга, чулуурхаг талбайд зориулсан L3 хээтэй.",
    descriptionEn: "L3 tread for gravel and rocky ground.",
    category: "TIRES",
    price: 2_950_000,
    stock: 8,
    unit: "pcs",
    compatibleWith: ["LOADER", "GRADER"],
  },
  {
    sku: "TR-TR-6002",
    nameMn: "Ачааны машины дугуй 12.00R20",
    nameEn: "Truck tire 12.00R20",
    descriptionMn: "Урт замын тээвэрт зориулсан, гүн хээтэй.",
    descriptionEn: "Deep tread for long-haul hauling.",
    category: "TIRES",
    price: 1_280_000,
    stock: 24,
    unit: "pcs",
    compatibleWith: ["TRUCK", "CONCRETE_MIXER"],
  },
  {
    sku: "TR-AT-7001",
    nameMn: "Экскаваторын шүд",
    nameEn: "Bucket teeth",
    descriptionMn: "Хатуу хөрсөнд зориулсан, 5 ширхэгийн багц.",
    descriptionEn: "Rock-duty teeth, pack of five.",
    category: "ATTACHMENTS",
    price: 340_000,
    stock: 58,
    unit: "set",
    compatibleWith: ["EXCAVATOR", "LOADER"],
  },
  {
    sku: "TR-AT-7002",
    nameMn: "Гидравлик алх",
    nameEn: "Hydraulic breaker",
    descriptionMn: "20 тонны экскаваторт тохирох 1400 кг алх.",
    descriptionEn: "1,400 kg breaker for 20-tonne excavators.",
    category: "ATTACHMENTS",
    price: 18_500_000,
    stock: 2,
    unit: "pcs",
    compatibleWith: ["EXCAVATOR"],
  },
  {
    sku: "TR-AT-7003",
    nameMn: "Бульдозерын ирний хавтан",
    nameEn: "Dozer cutting edge",
    descriptionMn: "Боолттой хамт, хатууруулсан ган ир.",
    descriptionEn: "Hardened steel edge, bolts included.",
    category: "ATTACHMENTS",
    price: 1_450_000,
    stock: 11,
    unit: "pcs",
    compatibleWith: ["BULLDOZER", "GRADER"],
  },
  {
    sku: "TR-CO-8001",
    nameMn: "Гидравлик тос 20л",
    nameEn: "Hydraulic oil 20 L",
    descriptionMn: "ISO VG 46, бүх улиралд ажиллах гидравлик тос.",
    descriptionEn: "ISO VG 46, all-season hydraulic oil.",
    category: "CONSUMABLES",
    price: 185_000,
    stock: 200,
    unit: "can",
    compatibleWith: [],
  },
  {
    sku: "TR-CO-8002",
    nameMn: "Хөдөлгүүрийн тос 15W-40, 20л",
    nameEn: "Engine oil 15W-40, 20 L",
    descriptionMn: "Дизель хөдөлгүүрт зориулсан CI-4 зэрэглэлийн тос.",
    descriptionEn: "CI-4 grade oil for diesel engines.",
    category: "CONSUMABLES",
    price: 168_000,
    stock: 180,
    unit: "can",
    compatibleWith: [],
  },
  {
    sku: "TR-CO-8003",
    nameMn: "Тосолгооны тос 18кг",
    nameEn: "Lithium grease 18 kg",
    descriptionMn: "Хүнд ачаалалд зориулсан лити суурьтай тос.",
    descriptionEn: "Lithium-based grease for heavy loads.",
    category: "CONSUMABLES",
    price: 145_000,
    stock: 96,
    unit: "pail",
    compatibleWith: [],
  },
];

/** Past purchases, so the orders tab isn't empty on the first walkthrough. */
const PAST_ORDERS = [
  {
    role: "OWNER" as const,
    index: 0,
    items: [
      { sku: "TR-FL-1001", quantity: 4 },
      { sku: "TR-CO-8002", quantity: 2 },
    ],
    status: "DELIVERED" as const,
    daysAgo: 26,
    note: "Ээлжит ТО-д зориулж авав.",
  },
  {
    role: "OWNER" as const,
    index: 1,
    items: [
      { sku: "TR-AT-7001", quantity: 2 },
      { sku: "TR-HY-2003", quantity: 3 },
    ],
    status: "SHIPPED" as const,
    daysAgo: 6,
    note: null,
  },
  {
    role: "OPERATOR" as const,
    index: 0,
    items: [{ sku: "TR-EL-5003", quantity: 2 }],
    status: "DELIVERED" as const,
    daysAgo: 13,
    note: null,
  },
];

const SERVICE_REQUESTS = [
  {
    role: "OWNER" as const,
    index: 0,
    category: "EXCAVATOR" as const,
    description:
      "Гидравликийн даралт унаж, сумны хөдөлгөөн удаашралтай болсон. Насосны оношилгоо хийлгэх шаардлагатай.",
    status: "OPEN" as const,
    daysAgo: 2,
    preferredInDays: 4,
    withEquipment: true,
  },
  {
    role: "OWNER" as const,
    index: 1,
    category: "TRUCK" as const,
    description: "Тоормосны колодка элэгдсэн, 40 000 км-ийн ээлжит үйлчилгээ хийлгэнэ.",
    status: "SCHEDULED" as const,
    daysAgo: 9,
    preferredInDays: 3,
    withEquipment: true,
  },
  {
    role: "COMPANY" as const,
    index: 0,
    category: "CONCRETE_MIXER" as const,
    description:
      "Түрээсэлсэн бетон зөөвөрлөгчийн холигчийн эргэлт жигд бус байна. Талбай дээр очиж үзэх хүсэлт.",
    status: "DONE" as const,
    daysAgo: 21,
    preferredInDays: null,
    withEquipment: false,
  },
];

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export async function seedStore(db: PrismaClient) {
  await db.part.createMany({ data: PARTS });

  const parts = await db.part.findMany();
  const bySku = new Map(parts.map((part) => [part.sku, part]));

  const [owners, operators, companies, revenue, external] = await Promise.all([
    db.user.findMany({ where: { role: "OWNER" }, orderBy: { phone: "asc" } }),
    db.user.findMany({ where: { role: "OPERATOR" }, orderBy: { phone: "asc" } }),
    db.user.findMany({ where: { role: "COMPANY" }, orderBy: { phone: "asc" } }),
    db.account.findFirstOrThrow({ where: { kind: "PLATFORM_REVENUE" } }),
    db.account.findFirstOrThrow({ where: { kind: "EXTERNAL" } }),
  ]);

  const usersByRole = { OWNER: owners, OPERATOR: operators, COMPANY: companies };

  let orderCount = 0;

  for (const seed of PAST_ORDERS) {
    const user = usersByRole[seed.role][seed.index];
    if (!user) continue;

    const items = seed.items
      .map((item) => {
        const part = bySku.get(item.sku);
        return part ? { partId: part.id, quantity: item.quantity } : null;
      })
      .filter((item): item is { partId: string; quantity: number } => item !== null);

    // Priced the same way a live checkout prices it, so the seeded history and
    // the running app can never disagree about what an order cost.
    const priced = priceCart(parts, items);
    if (priced.lines.length === 0) continue;

    const wallet = await db.account.findUniqueOrThrow({ where: { userId: user.id } });
    const createdAt = daysAgo(seed.daysAgo);

    const order = await db.storeOrder.create({
      data: {
        userId: user.id,
        status: seed.status,
        totalAmount: priced.total,
        address: "Улаанбаатар, Хан-Уул дүүрэг, 3-р хороо",
        note: seed.note,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: priced.lines.map((line) => ({
            partId: line.partId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        },
      },
    });

    for (const line of priced.lines) {
      await db.part.update({
        where: { id: line.partId },
        data: { stock: { decrement: line.quantity } },
      });
    }

    const balance = await balanceOf(db, wallet.id);
    const plan = planPurchase(
      priced.total,
      { buyer: wallet.id, platformRevenue: revenue.id, external: external.id },
      balance,
    );

    for (const transaction of plan) {
      await postTransaction(db, {
        ...transaction,
        storeOrderId: order.id,
        createdAt,
      });
    }

    await db.notification.create({
      data: {
        userId: user.id,
        type: "STORE_ORDER_PLACED",
        data: { count: priced.lines.length, amount: priced.total },
        link: "/store/orders",
        readAt: createdAt,
        createdAt,
      },
    });

    orderCount += 1;
  }

  let requestCount = 0;

  for (const seed of SERVICE_REQUESTS) {
    const user = usersByRole[seed.role][seed.index];
    if (!user) continue;

    const equipment = seed.withEquipment
      ? await db.equipment.findFirst({
          where: { ownerId: user.id, category: seed.category },
          orderBy: { createdAt: "asc" },
        })
      : null;

    const createdAt = daysAgo(seed.daysAgo);

    await db.serviceRequest.create({
      data: {
        requesterId: user.id,
        equipmentId: equipment?.id ?? null,
        category: seed.category,
        description: seed.description,
        preferredAt:
          seed.preferredInDays === null ? null : daysFromNow(seed.preferredInDays),
        status: seed.status,
        createdAt,
        updatedAt: createdAt,
      },
    });

    requestCount += 1;
  }

  // Nudge a few stock levels so the catalogue shows low-stock and sold-out
  // states rather than a uniform wall of availability.
  const scarce = ["TR-HY-2001", "TR-UC-3001", "TR-AT-7002"];
  const random = rng(4711);
  for (const sku of scarce) {
    const part = bySku.get(sku);
    if (!part) continue;
    await db.part.update({
      where: { id: part.id },
      data: { stock: Math.floor(random() * 3) },
    });
  }

  return {
    parts: parts.length,
    storeOrders: orderCount,
    serviceRequests: requestCount,
  };
}
