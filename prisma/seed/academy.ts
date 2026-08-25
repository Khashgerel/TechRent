import { certificateSerial } from "../../lib/academy/grading";
import type { PrismaClient } from "../../lib/generated/prisma/client";
import type { EquipmentCategory, OperatorLevel } from "../../lib/generated/prisma/enums";

/**
 * Operator Academy content.
 *
 * The decks put the Academy at the centre of the operator's story: training
 * raises level, level unlocks higher-tier work. So courses carry a category and
 * a points award, and passing the quiz issues a certificate that feeds straight
 * into the same level thresholds the booking flow uses.
 */

type LessonSeed = {
  titleMn: string;
  titleEn: string;
  contentMn: string;
  contentEn: string;
  durationMin: number;
};

type QuestionSeed = {
  promptMn: string;
  promptEn: string;
  options: { mn: string; en: string }[];
  correctIndex: number;
  explanationMn: string;
  explanationEn: string;
};

type CourseSeed = {
  slug: string;
  titleMn: string;
  titleEn: string;
  descriptionMn: string;
  descriptionEn: string;
  category: EquipmentCategory;
  level: OperatorLevel;
  coverColor: string;
  icon: string;
  pointsAward: number;
  lessons: LessonSeed[];
  questions: QuestionSeed[];
};

export const COURSES: CourseSeed[] = [
  {
    slug: "excavator-basics",
    titleMn: "Экскаваторын үндэс",
    titleEn: "Excavator fundamentals",
    descriptionMn:
      "Экскаватор ажиллуулах анхан шатны мэдлэг: аюулгүй ажиллагаа, өдөр тутмын үзлэг, үндсэн хөдөлгөөн.",
    descriptionEn:
      "The basics of running an excavator: safety, daily checks, and core movements.",
    category: "EXCAVATOR",
    level: "BEGINNER",
    coverColor: "#1a56db",
    icon: "shovel",
    pointsAward: 120,
    lessons: [
      {
        titleMn: "Ажил эхлэхийн өмнөх үзлэг",
        titleEn: "Pre-start inspection",
        contentMn:
          "Өдөр бүр ажил эхлэхийн өмнө гидравлик шингэний түвшин, тосны алдагдал, явах эд ангийн элэгдэл, хувингийн шүдний бэхэлгээг шалгана. Илэрсэн доголдлыг бүртгэж, эзэмшигчид мэдэгдэнэ. Шалгалтгүй ажил эхлэх нь ослын хамгийн түгээмэл шалтгаан юм.",
        contentEn:
          "Before each shift, check hydraulic fluid levels, look for leaks, inspect undercarriage wear, and confirm the bucket teeth are secure. Log anything you find and tell the owner. Skipping the walk-around is the most common cause of incidents.",
        durationMin: 12,
      },
      {
        titleMn: "Тогтвортой байрлал ба ажлын талбай",
        titleEn: "Stability and the work zone",
        contentMn:
          "Машиныг тэгш, бат бөх хөрсөн дээр байрлуулна. Ухсан суваг эсвэл налуугийн ирмэгээс машины өргөнөөс багагүй зайд байрлах ёстой. Эргэх радиус доторх бүсийг тэмдэглэж, хүн нэвтрэхийг хориглоно.",
        contentEn:
          "Set up on level, firm ground. Keep at least one machine width back from the edge of a trench or slope. Mark the swing radius and keep people out of it.",
        durationMin: 15,
      },
      {
        titleMn: "Үндсэн хөдөлгөөн ба ухалтын дараалал",
        titleEn: "Core movements and dig sequence",
        contentMn:
          "Сум, бэх, хувин гурвыг зэрэг зохицуулж жигд хөдөлгөөн хийнэ. Ухалтыг ойроос эхэлж холдуулах бус, холоос эхэлж ойртуулах нь хөрсний ачааллыг жигд болгодог. Хувинг дүүргэхдээ хэт гүн шумбуулахаас зайлсхий.",
        contentEn:
          "Coordinate boom, stick and bucket for one smooth motion. Work from far to near rather than near to far — it spreads the load evenly. Avoid burying the bucket too deep when filling.",
        durationMin: 18,
      },
      {
        titleMn: "Ачаа тээвэрлэлт ба зогсолт",
        titleEn: "Loading and shutdown",
        contentMn:
          "Ачааг машины хажуугаар биш, ар талаар нь эргүүлэхээс зайлсхийж, ачааны машины тэвшинд жигд тарааж ачна. Ажил дуусахад хувинг газарт буулгаж, гидравликийн даралтыг тайлж, түлхүүрийг авна.",
        contentEn:
          "Load evenly into the truck bed and avoid swinging a full bucket over the cab. At shutdown, rest the bucket on the ground, release hydraulic pressure, and take the key.",
        durationMin: 10,
      },
    ],
    questions: [
      {
        promptMn: "Ажил эхлэхийн өмнөх үзлэгээр юуг заавал шалгах вэ?",
        promptEn: "What must a pre-start inspection always cover?",
        options: [
          { mn: "Зөвхөн түлшний хэмжээ", en: "Fuel level only" },
          {
            mn: "Гидравлик шингэн, тосны алдагдал, явах эд анги",
            en: "Hydraulic fluid, leaks, and the undercarriage",
          },
          { mn: "Зөвхөн бүхээгийн цэвэрлэгээ", en: "Cab cleanliness only" },
          { mn: "Радиогийн ажиллагаа", en: "That the radio works" },
        ],
        correctIndex: 1,
        explanationMn:
          "Гидравлик систем, алдагдал, явах эд ангийн элэгдэл нь аюулгүй ажиллагааны үндэс.",
        explanationEn:
          "Hydraulics, leaks and undercarriage wear are the safety-critical items.",
      },
      {
        promptMn: "Сувгийн ирмэгээс хэр зайд байрлах нь зөв бэ?",
        promptEn: "How far back from a trench edge should you set up?",
        options: [
          { mn: "Ирмэг дээр шууд", en: "Right on the edge" },
          { mn: "Хагас метр", en: "Half a metre" },
          {
            mn: "Машины өргөнөөс багагүй зайд",
            en: "At least one machine width",
          },
          { mn: "Ямар ч зай хамаагүй", en: "Distance doesn't matter" },
        ],
        correctIndex: 2,
        explanationMn:
          "Хөрс нурах эрсдэлээс сэргийлж машины өргөнөөс багагүй зай барина.",
        explanationEn:
          "One machine width back guards against the edge collapsing under the tracks.",
      },
      {
        promptMn: "Ухалтын зөв дараалал аль нь вэ?",
        promptEn: "Which dig sequence is correct?",
        options: [
          { mn: "Холоос ойртуулж ухах", en: "Working from far to near" },
          { mn: "Ойроос холдуулж ухах", en: "Working from near to far" },
          { mn: "Санамсаргүй дарааллаар", en: "In no particular order" },
          { mn: "Зөвхөн төвөөс нь", en: "Only from the centre" },
        ],
        correctIndex: 0,
        explanationMn: "Холоос ойртуулах нь хөрсний ачааллыг жигд болгодог.",
        explanationEn: "Far to near keeps the load on the machine even.",
      },
      {
        promptMn: "Ажил дуусахад юу хийх ёстой вэ?",
        promptEn: "What should you do at shutdown?",
        options: [
          { mn: "Хувинг агаарт үлдээх", en: "Leave the bucket raised" },
          {
            mn: "Хувинг газарт буулгаж, даралтыг тайлах",
            en: "Rest the bucket down and release pressure",
          },
          { mn: "Хөдөлгүүрийг асаалттай орхих", en: "Leave the engine running" },
          { mn: "Түлхүүрийг бүхээгт үлдээх", en: "Leave the key in the cab" },
        ],
        correctIndex: 1,
        explanationMn:
          "Хувинг буулгаж даралтыг тайлснаар гэнэтийн хөдөлгөөнөөс сэргийлнэ.",
        explanationEn:
          "Lowering the bucket and releasing pressure prevents unexpected movement.",
      },
    ],
  },
  {
    slug: "site-safety",
    titleMn: "Талбайн аюулгүй ажиллагаа",
    titleEn: "Site safety",
    descriptionMn:
      "Барилгын талбайн аюулгүй байдал: дохио дуут харилцаа, хамгаалах хэрэгсэл, ослын үеийн үйлдэл.",
    descriptionEn:
      "Staying safe on site: signalling, protective equipment, and what to do when something goes wrong.",
    category: "EXCAVATOR",
    level: "BEGINNER",
    coverColor: "#059669",
    icon: "hard-hat",
    pointsAward: 100,
    lessons: [
      {
        titleMn: "Хамгаалах хэрэгсэл",
        titleEn: "Protective equipment",
        contentMn:
          "Каск, хамгаалалтын гутал, тод хантааз нь талбайн доод шаардлага. Чичиргээ ихтэй техник дээр сонсголын хамгаалалт заавал хэрэглэнэ.",
        contentEn:
          "Hard hat, safety boots and a high-visibility vest are the site minimum. Hearing protection is mandatory on high-vibration machines.",
        durationMin: 8,
      },
      {
        titleMn: "Дохиоллын харилцаа",
        titleEn: "Signalling",
        contentMn:
          "Оператор ба дохиочин хоёрын хооронд нэг л хүн дохио өгнө. Харагдахгүй болбол хөдөлгөөнийг зогсооно. Гар дохионы утга талбай бүрд ижил байх ёстой.",
        contentEn:
          "Only one person signals the operator. If you lose sight of the signaller, stop. Hand signals must mean the same thing across the whole site.",
        durationMin: 10,
      },
      {
        titleMn: "Ослын үеийн үйлдэл",
        titleEn: "When something goes wrong",
        contentMn:
          "Осол гарвал эхлээд машиныг зогсоож, талбайг хамгаална. Дараа нь анхны тусламж, дараа нь мэдэгдэл. Дараалал нь чухал.",
        contentEn:
          "Stop the machine and secure the area first. Then first aid, then reporting. The order matters.",
        durationMin: 12,
      },
    ],
    questions: [
      {
        promptMn: "Оператортай хэдэн хүн дохио харилцах ёстой вэ?",
        promptEn: "How many people should signal the operator?",
        options: [
          { mn: "Хэн ч болно", en: "Anyone nearby" },
          { mn: "Зөвхөн нэг хүн", en: "Exactly one person" },
          { mn: "Хоёроос гурав", en: "Two or three" },
          { mn: "Бригад бүхэлдээ", en: "The whole crew" },
        ],
        correctIndex: 1,
        explanationMn: "Нэг л дохиочин байснаар зөрчилдөх заавраас сэргийлнэ.",
        explanationEn: "A single signaller prevents contradictory instructions.",
      },
      {
        promptMn: "Дохиочин харагдахаа болив яах вэ?",
        promptEn: "What if you lose sight of the signaller?",
        options: [
          { mn: "Үргэлжлүүлэн ажиллах", en: "Keep working" },
          { mn: "Хурдаа нэмэх", en: "Speed up to finish" },
          { mn: "Хөдөлгөөнийг зогсоох", en: "Stop moving" },
          { mn: "Дуу хийж дуудах", en: "Sound the horn and continue" },
        ],
        correctIndex: 2,
        explanationMn: "Харагдахгүй бол зогсох нь цорын ганц зөв хариу үйлдэл.",
        explanationEn: "Stopping is the only correct response to losing visual contact.",
      },
      {
        promptMn: "Ослын үед зөв дараалал юу вэ?",
        promptEn: "What is the correct order after an incident?",
        options: [
          {
            mn: "Мэдэгдэх → тусламж → зогсоох",
            en: "Report, then first aid, then stop",
          },
          {
            mn: "Зогсоох → тусламж → мэдэгдэх",
            en: "Stop and secure, then first aid, then report",
          },
          { mn: "Тусламж → зогсоох → мэдэгдэх", en: "First aid, stop, report" },
          { mn: "Юу ч хийхгүй хүлээх", en: "Wait and do nothing" },
        ],
        correctIndex: 1,
        explanationMn:
          "Талбайг эхлээд аюулгүй болгосноор нэмэлт осол гарахаас сэргийлнэ.",
        explanationEn:
          "Securing the area first prevents a second incident on top of the first.",
      },
    ],
  },
  {
    slug: "crane-signals",
    titleMn: "Краны дохио ба ачаалал",
    titleEn: "Crane signals and load charts",
    descriptionMn:
      "Кран ажиллуулах дунд шатны сургалт: ачааллын хүснэгт, дохио, салхины хязгаар.",
    descriptionEn:
      "Intermediate crane work: reading load charts, signalling, and wind limits.",
    category: "CRANE",
    level: "INTERMEDIATE",
    coverColor: "#ea580c",
    icon: "construction",
    pointsAward: 180,
    lessons: [
      {
        titleMn: "Ачааллын хүснэгт унших",
        titleEn: "Reading the load chart",
        contentMn:
          "Ачааллын хүснэгт нь сумны урт, өнцөг, ачааны радиус гурвын хамаарлыг харуулна. Радиус нэмэгдэх тусам зөвшөөрөгдөх ачаа эрс буурдаг. Хүснэгтэд заасан утгыг хэзээ ч хэтрүүлэхгүй.",
        contentEn:
          "The load chart ties boom length, angle and load radius together. As radius grows, the safe load drops sharply. Never exceed the charted figure.",
        durationMin: 20,
      },
      {
        titleMn: "Салхи ба цаг агаарын хязгаар",
        titleEn: "Wind and weather limits",
        contentMn:
          "Ихэнх авто краны хувьд салхины хурд 10 м/с давбал өргөх ажлыг зогсооно. Том гадаргуутай ачаа салхинд илүү мэдрэмтгий байдгийг анхаарна.",
        contentEn:
          "For most mobile cranes, lifting stops above roughly 10 m/s wind. Loads with a large surface area catch far more wind than their weight suggests.",
        durationMin: 12,
      },
      {
        titleMn: "Тулгуур ба суурь",
        titleEn: "Outriggers and ground bearing",
        contentMn:
          "Тулгуурыг бүрэн гаргаж, тавцан дээр байрлуулна. Зөөлөн хөрсөн дээр даацын хавтан ашиглана. Тулгуур бүрэн гараагүй үед хүснэгтийн утга хүчингүй болно.",
        contentEn:
          "Extend outriggers fully and set them on pads. Use bearing plates on soft ground. With outriggers partly extended, the load chart no longer applies.",
        durationMin: 15,
      },
    ],
    questions: [
      {
        promptMn: "Ачааны радиус нэмэгдэхэд юу болох вэ?",
        promptEn: "What happens as the load radius increases?",
        options: [
          { mn: "Зөвшөөрөгдөх ачаа нэмэгдэнэ", en: "The safe load increases" },
          { mn: "Зөвшөөрөгдөх ачаа буурна", en: "The safe load drops" },
          { mn: "Өөрчлөгдөхгүй", en: "Nothing changes" },
          { mn: "Зөвхөн хурд буурна", en: "Only the speed drops" },
        ],
        correctIndex: 1,
        explanationMn: "Радиус нэмэгдэх тусам краны тогтвортой байдал буурдаг.",
        explanationEn: "A longer radius reduces the crane's stability margin.",
      },
      {
        promptMn: "Тулгуур бүрэн гараагүй үед ачааллын хүснэгт хүчинтэй юу?",
        promptEn: "Does the load chart apply with outriggers partly extended?",
        options: [
          { mn: "Тийм, хэвийн хүчинтэй", en: "Yes, it applies normally" },
          { mn: "Үгүй, хүчингүй болно", en: "No, it no longer applies" },
          { mn: "Зөвхөн хөнгөн ачаанд", en: "Only for light loads" },
          { mn: "Салхигүй үед хүчинтэй", en: "Only when there's no wind" },
        ],
        correctIndex: 1,
        explanationMn:
          "Хүснэгт нь тулгуур бүрэн гарсан нөхцөлд тооцогдсон байдаг.",
        explanationEn: "Charts are calculated for fully extended outriggers.",
      },
      {
        promptMn: "Ойролцоогоор ямар салхинд өргөх ажлыг зогсоох вэ?",
        promptEn: "Around what wind speed should lifting stop?",
        options: [
          { mn: "3 м/с", en: "3 m/s" },
          { mn: "10 м/с", en: "10 m/s" },
          { mn: "25 м/с", en: "25 m/s" },
          { mn: "Хязгаар байхгүй", en: "There is no limit" },
        ],
        correctIndex: 1,
        explanationMn: "Ихэнх авто краны хязгаар 10 м/с орчим байдаг.",
        explanationEn: "Most mobile cranes stop at roughly 10 m/s.",
      },
    ],
  },
  {
    slug: "loader-productivity",
    titleMn: "Ачигчийн бүтээмж",
    titleEn: "Loader productivity",
    descriptionMn:
      "Дугуйт ачигчийн бүтээмж, түлш хэмнэлт, дугуйн элэгдлийг бууруулах арга.",
    descriptionEn:
      "Getting more out of a wheel loader: cycle efficiency, fuel use, and tyre wear.",
    category: "LOADER",
    level: "INTERMEDIATE",
    coverColor: "#f59e0b",
    icon: "forklift",
    pointsAward: 150,
    lessons: [
      {
        titleMn: "V-хэлбэрийн ачилтын арга",
        titleEn: "The V-pattern load cycle",
        contentMn:
          "Ачигч болон ачааны машины хооронд V хэлбэрээр хөдөлснөөр эргэлтийн зай багасаж, нэг мөчлөгийн хугацаа 20 хүртэл хувь буурдаг. Ачааны машиныг овоолгын 45 хэмийн өнцөгт байрлуулна.",
        contentEn:
          "Moving in a V between pile and truck shortens the travel path and can cut cycle time by up to 20%. Park the truck at about 45° to the pile.",
        durationMin: 14,
      },
      {
        titleMn: "Түлш хэмнэх горим",
        titleEn: "Fuel-efficient operation",
        contentMn:
          "Хөдөлгүүрийг дээд эргэлтэд байнга ажиллуулах шаардлагагүй. Дунд эргэлтэд гидравлик хүч хангалттай байдаг бөгөөд түлшний зарцуулалт мэдэгдэхүйц буурна.",
        contentEn:
          "You rarely need full engine revs. Mid-range gives enough hydraulic power and noticeably lowers fuel burn.",
        durationMin: 10,
      },
      {
        titleMn: "Дугуйн элэгдэл",
        titleEn: "Tyre wear",
        contentMn:
          "Хурдан эргэх, гулсах нь дугуйн элэгдлийн гол шалтгаан. Ажлын талбайг тэгшилж, том чулууг зайлуулснаар дугуйн насыг ихээхэн уртасгана.",
        contentEn:
          "Spinning and sharp turns are what kill tyres. Keeping the working surface graded and clear of large rock extends tyre life substantially.",
        durationMin: 9,
      },
    ],
    questions: [
      {
        promptMn: "V-хэлбэрийн ачилт юуг сайжруулдаг вэ?",
        promptEn: "What does the V-pattern improve?",
        options: [
          { mn: "Мөчлөгийн хугацааг богиносгоно", en: "It shortens cycle time" },
          { mn: "Хувингийн багтаамжийг нэмнэ", en: "It increases bucket capacity" },
          { mn: "Хөдөлгүүрийн хүчийг нэмнэ", en: "It adds engine power" },
          { mn: "Юу ч өөрчлөхгүй", en: "It changes nothing" },
        ],
        correctIndex: 0,
        explanationMn: "Хөдөлгөөний зай багасах тусам мөчлөг богиносдог.",
        explanationEn: "A shorter travel path means a shorter cycle.",
      },
      {
        promptMn: "Дугуйн элэгдлийн гол шалтгаан юу вэ?",
        promptEn: "What causes most tyre wear?",
        options: [
          { mn: "Хүйтэн цаг агаар", en: "Cold weather" },
          { mn: "Гулсалт ба хурдан эргэлт", en: "Spinning and sharp turns" },
          { mn: "Шөнийн ажил", en: "Working at night" },
          { mn: "Хөнгөн ачаа", en: "Light loads" },
        ],
        correctIndex: 1,
        explanationMn: "Гулсалт нь дугуйн гадаргууг хамгийн хурдан элээдэг.",
        explanationEn: "Wheelspin scrubs the tread away faster than anything else.",
      },
      {
        promptMn: "Түлш хэмнэхийн тулд хөдөлгүүрийг яаж ажиллуулах вэ?",
        promptEn: "How should you run the engine to save fuel?",
        options: [
          { mn: "Байнга дээд эргэлтэд", en: "Always at full revs" },
          { mn: "Дунд эргэлтэд", en: "In the mid range" },
          { mn: "Хамгийн бага эргэлтэд", en: "At idle" },
          { mn: "Байнга унтрааж асаах", en: "Switching it off and on constantly" },
        ],
        correctIndex: 1,
        explanationMn:
          "Дунд эргэлт гидравлик хүчийг хангаж, түлш хэмнэнэ.",
        explanationEn: "Mid-range revs supply enough hydraulic power for less fuel.",
      },
    ],
  },
  {
    slug: "heavy-haul",
    titleMn: "Хүнд даацын тээвэр",
    titleEn: "Heavy haulage",
    descriptionMn:
      "Хүнд даацын ачаа тээвэрлэх: ачаа бэхлэх, тэнхлэгийн ачаалал, замын аюулгүй байдал.",
    descriptionEn:
      "Moving heavy loads: securing cargo, axle limits, and road safety.",
    category: "TRUCK",
    level: "ADVANCED",
    coverColor: "#2563eb",
    icon: "truck",
    pointsAward: 200,
    lessons: [
      {
        titleMn: "Ачаа бэхлэлт",
        titleEn: "Securing the load",
        contentMn:
          "Ачааны жин, хэлбэр бүрд тохирсон бэхэлгээ шаардлагатай. Гинж, татлагын тоо нь ачааны жингээс хамаарна. Замд гарсны дараа эхний 50 км-т бэхэлгээг дахин шалгана.",
        contentEn:
          "Different loads need different restraints. The number of chains or straps follows the load weight. Re-check the securing after the first 50 km.",
        durationMin: 16,
      },
      {
        titleMn: "Тэнхлэгийн ачаалал",
        titleEn: "Axle loading",
        contentMn:
          "Ачааг тэнхлэг хооронд жигд хуваарилна. Урд тэнхлэг хэт ачаалагдвал жолоодлого хүндэрч, хойд тэнхлэг хэт ачаалагдвал тоормослолт муудна.",
        contentEn:
          "Spread the load evenly between axles. Too much on the front makes steering heavy; too much on the rear ruins braking.",
        durationMin: 14,
      },
      {
        titleMn: "Уулын зам ба уруудалт",
        titleEn: "Mountain roads and descents",
        contentMn:
          "Уруудахдаа тоормосонд бүрэн найдахгүй, хөдөлгүүрийн тоормослолт ашиглана. Өгсөхөд сонгосон араагаараа тогтвортой явах нь тоормосны хэт халалтаас сэргийлнэ.",
        contentEn:
          "On a descent, use engine braking rather than relying on the service brakes. Holding a steady gear prevents brake fade.",
        durationMin: 13,
      },
    ],
    questions: [
      {
        promptMn: "Замд гарсны дараа бэхэлгээг хэзээ дахин шалгах вэ?",
        promptEn: "When should you re-check the load securing?",
        options: [
          { mn: "Шалгах шаардлагагүй", en: "No need to re-check" },
          { mn: "Эхний 50 км-ийн дараа", en: "After the first 50 km" },
          { mn: "Зорьсон газартаа очоод", en: "Only on arrival" },
          { mn: "Долоо хоногт нэг удаа", en: "Once a week" },
        ],
        correctIndex: 1,
        explanationMn: "Хөдөлгөөний үед бэхэлгээ суларч болзошгүй.",
        explanationEn: "Restraints commonly loosen once the load settles.",
      },
      {
        promptMn: "Хойд тэнхлэг хэт ачаалагдвал юу болох вэ?",
        promptEn: "What happens if the rear axle is overloaded?",
        options: [
          { mn: "Жолоодлого хөнгөрнө", en: "Steering gets lighter" },
          { mn: "Тоормослолт муудна", en: "Braking gets worse" },
          { mn: "Түлш хэмнэнэ", en: "It saves fuel" },
          { mn: "Юу ч болохгүй", en: "Nothing happens" },
        ],
        correctIndex: 1,
        explanationMn: "Тэнхлэгийн жигд бус ачаалал тоормосны үр дүнг бууруулна.",
        explanationEn: "Uneven axle loading reduces braking effectiveness.",
      },
      {
        promptMn: "Уруудахад юуг ашиглах нь зөв бэ?",
        promptEn: "What should you use on a long descent?",
        options: [
          { mn: "Зөвхөн ажлын тоормос", en: "Service brakes only" },
          { mn: "Хөдөлгүүрийн тоормослолт", en: "Engine braking" },
          { mn: "Саармаг араа", en: "Neutral gear" },
          { mn: "Гар тоормос", en: "The parking brake" },
        ],
        correctIndex: 1,
        explanationMn: "Хөдөлгүүрийн тоормослолт нь тоормосны халалтаас сэргийлнэ.",
        explanationEn: "Engine braking keeps the service brakes from overheating.",
      },
    ],
  },
];

export async function seedAcademy(db: PrismaClient) {
  let lessons = 0;
  let questions = 0;

  for (const course of COURSES) {
    const created = await db.course.create({
      data: {
        slug: course.slug,
        titleMn: course.titleMn,
        titleEn: course.titleEn,
        descriptionMn: course.descriptionMn,
        descriptionEn: course.descriptionEn,
        category: course.category,
        level: course.level,
        coverColor: course.coverColor,
        icon: course.icon,
        durationMin: course.lessons.reduce((sum, l) => sum + l.durationMin, 0),
        pointsAward: course.pointsAward,
        published: true,
      },
    });

    for (const [index, lesson] of course.lessons.entries()) {
      await db.lesson.create({
        data: {
          courseId: created.id,
          order: index + 1,
          titleMn: lesson.titleMn,
          titleEn: lesson.titleEn,
          contentMn: lesson.contentMn,
          contentEn: lesson.contentEn,
          durationMin: lesson.durationMin,
        },
      });
      lessons++;
    }

    for (const [index, question] of course.questions.entries()) {
      await db.quizQuestion.create({
        data: {
          courseId: created.id,
          order: index + 1,
          promptMn: question.promptMn,
          promptEn: question.promptEn,
          options: question.options,
          correctIndex: question.correctIndex,
          explanationMn: question.explanationMn,
          explanationEn: question.explanationEn,
        },
      });
      questions++;
    }
  }

  return { courses: COURSES.length, lessons, questions };
}

/**
 * Gives operators some Academy history, so the catalogue isn't a wall of
 * untouched courses and the certificates panel has something in it. Progress is
 * spread deterministically: some finished, some mid-course, some untouched.
 */
export async function seedAcademyProgress(db: PrismaClient) {
  const operators = await db.operatorProfile.findMany({
    include: { user: { select: { id: true } } },
    orderBy: { id: "asc" },
  });

  const courses = await db.course.findMany({
    include: { lessons: { orderBy: { order: "asc" } } },
    orderBy: { slug: "asc" },
  });

  let enrollments = 0;
  let certificates = 0;

  for (const [index, operator] of operators.entries()) {
    // Every third operator gets a finished course, the next a part-finished one.
    const finished = courses[index % courses.length];
    const started = courses[(index + 1) % courses.length];

    if (index % 3 !== 2 && finished) {
      const enrollment = await db.enrollment.create({
        data: {
          userId: operator.user.id,
          courseId: finished.id,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
      enrollments++;

      for (const lesson of finished.lessons) {
        await db.lessonCompletion.create({
          data: { enrollmentId: enrollment.id, lessonId: lesson.id },
        });
      }

      const score = 75 + ((index * 7) % 26);
      await db.quizAttempt.create({
        data: {
          enrollmentId: enrollment.id,
          score: Math.round((score / 100) * 4),
          totalPoints: 4,
          passed: true,
          answers: [],
        },
      });

      const issuedAt = new Date();
      issuedAt.setDate(issuedAt.getDate() - (10 + index));

      await db.certificate.create({
        data: {
          userId: operator.user.id,
          courseId: finished.id,
          serial: certificateSerial(finished.slug, operator.user.id, issuedAt),
          score,
          issuedAt,
        },
      });
      certificates++;
    }

    if (index % 2 === 0 && started && started.id !== finished?.id) {
      const enrollment = await db.enrollment.create({
        data: { userId: operator.user.id, courseId: started.id },
      });
      enrollments++;

      // Part-way through: read roughly half the lessons.
      const readCount = Math.max(1, Math.floor(started.lessons.length / 2));
      for (const lesson of started.lessons.slice(0, readCount)) {
        await db.lessonCompletion.create({
          data: { enrollmentId: enrollment.id, lessonId: lesson.id },
        });
      }
    }
  }

  return { enrollments, certificates };
}
