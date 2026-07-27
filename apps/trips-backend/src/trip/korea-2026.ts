/**
 * The Korea 2026 itinerary, transcribed from the authored plan (31 July – 15 August).
 *
 * Checked in as data rather than typed into the database by hand: it is reviewable in a diff,
 * it can be re-imported after a schema change, and the plan is a real artefact that predates
 * this service — the app renders it, it does not own it.
 *
 * Times are local wall-clock strings on purpose. Half the entries are open-ended ("20:00
 * onwards") and the whole trip sits in one timezone, so instants would invent precision the
 * plan does not have.
 *
 * `optionGroup` marks alternatives that the team picks between — the plan already worked this
 * way before the app did (NORMAL vs ABSOLUTELY WRECKED on 1 Aug; full vs short Hallasan route
 * on 5 Aug).
 */

export interface SeedItem {
  startsAt?: string;
  endsAt?: string;
  title: string;
  titleKr?: string;
  details?: string;
  address?: string;
  addressKr?: string;
  cost?: string;
  bookingUrl?: string;
  optionGroup?: string;
  optionLabel?: string;
}

export interface SeedDay {
  date: string;
  title?: string;
  city: string;
  items: SeedItem[];
}

export interface SeedTrip {
  name: string;
  startDate: string;
  endDate: string;
  baseName: string;
  baseAddress: string;
  baseAddressKr: string;
  days: SeedDay[];
}

export const KOREA_2026: SeedTrip = {
  name: "Korea 2026",
  startDate: "2026-07-31",
  endDate: "2026-08-15",
  baseName: "Sambu Golden Tower (삼부골든타워)",
  baseAddress: "295 Dokmak-ro, Mapo-gu, Seoul",
  baseAddressKr: "서울특별시 마포구 독막로 295",
  days: [
    {
      date: "2026-07-31",
      title: "Arrival + Hongdae",
      city: "Seoul",
      items: [
        { startsAt: "11:45", title: "Arrival at Incheon Airport", titleKr: "인천공항" },
        { startsAt: "13:00", title: "Immigration and luggage" },
        {
          startsAt: "13:20",
          title: "Limousine Bus 6015",
          details:
            "인천공항 제1터미널 5B-1 → 공덕역·롯데시티호텔 (Incheon Airport T1, Stop 5B-1 → Gongdeok Station / Lotte City Hotel)",
          cost: "₩17,000 per person · pay with WOWPASS",
        },
        {
          startsAt: "14:40",
          title: "Accommodation",
          details: "공덕역·롯데시티호텔 → 삼부골든타워",
        },
        { startsAt: "15:00", endsAt: "19:00", title: "Check-in, food, shower and sleep" },
        {
          startsAt: "19:30",
          title: "Move to Hongdae",
          titleKr: "홍대",
          details: "경의선숲길 → 홍대 (Gyeongui Line Forest Park → Hongdae)",
        },
        {
          startsAt: "20:00",
          endsAt: "22:00",
          title: "Dinner and drinks in Hongdae",
          titleKr: "홍대",
        },
        { startsAt: "23:00", title: "Hongdae clubbing", titleKr: "홍대" },
      ],
    },
    {
      date: "2026-08-01",
      title: "Padel + birthday night",
      city: "Seoul",
      items: [
        { startsAt: "11:30", title: "Wake up", optionGroup: "aug1-start", optionLabel: "Normal" },
        {
          startsAt: "12:30",
          title: "Leave home",
          optionGroup: "aug1-start",
          optionLabel: "Normal",
        },
        {
          startsAt: "13:00",
          endsAt: "14:30",
          title: "Yongridan-gil",
          titleKr: "용리단길",
          details:
            "삼각지역 3번 출구 → 용리단길 → 신용산역 → 아이파크몰. Brunch, coffee and an easy walk.",
          optionGroup: "aug1-start",
          optionLabel: "Normal",
        },
        {
          startsAt: "14:30",
          endsAt: "15:30",
          title: "I'Park Mall",
          titleKr: "아이파크몰",
          optionGroup: "aug1-start",
          optionLabel: "Normal",
        },
        {
          startsAt: "13:00",
          title: "Wake up (late)",
          optionGroup: "aug1-start",
          optionLabel: "Absolutely wrecked",
        },
        {
          startsAt: "13:30",
          endsAt: "14:30",
          title: "Brunch near home",
          optionGroup: "aug1-start",
          optionLabel: "Absolutely wrecked",
        },
        {
          startsAt: "15:00",
          title: "Move to padel",
          details: "공덕역 → 용산역 → 아이파크몰",
          optionGroup: "aug1-start",
          optionLabel: "Absolutely wrecked",
        },
        {
          startsAt: "16:00",
          endsAt: "17:30",
          title: "Beginner padel — MMOVE Padel Lounge",
          titleKr: "엠무브 빠델라운지",
          address: "7F I'Park Mall, 55 Hangang-daero 23-gil, Yongsan-gu, Seoul",
          addressKr: "서울특별시 용산구 한강대로23길 55, 아이파크몰 7층",
          cost: "awaiting MMOVE's quote",
          details: "Contact: MMOVE Instagram",
        },
        {
          startsAt: "17:30",
          title: "Return home",
          details: "용산역 → 공덕역 → 삼부골든타워",
        },
        { startsAt: "17:30", endsAt: "19:30", title: "Shower and change" },
        {
          startsAt: "20:00",
          endsAt: "22:00",
          title: "Birthday dinner — Today Chicken Sinchon",
          titleKr: "오늘통닭 신촌직영점",
          address: "8 Yonsei-ro 11-gil, Seodaemun-gu, Seoul",
          addressKr: "서울특별시 서대문구 연세로11길 8",
        },
        { startsAt: "22:00", title: "Hongdae birthday night", titleKr: "홍대" },
      ],
    },
    {
      date: "2026-08-02",
      title: "Eungbongsan + Seongsu + sunset SUP",
      city: "Seoul",
      items: [
        { startsAt: "12:30", title: "Leave home" },
        {
          startsAt: "13:15",
          endsAt: "14:30",
          title: "Eungbongsan",
          titleKr: "응봉산",
          details:
            "Start: 응봉역 2번 출구. 응봉역 → 응봉산 팔각정 → 용비교 → 서울숲 (Eungbong Station → Octagonal Pavilion → Yongbi Bridge → Seoul Forest)",
        },
        { startsAt: "14:30", endsAt: "15:15", title: "Seoul Forest", titleKr: "서울숲" },
        {
          startsAt: "15:15",
          endsAt: "17:30",
          title: "Seongsu",
          titleKr: "성수",
          details: "서울숲 → 서울숲2길 → 성수. Late lunch, shops and pop-ups.",
        },
        {
          startsAt: "17:30",
          title: "Move to SUP",
          details: "자양역 2번 출구 → 서울윈드서핑장 25호",
        },
        {
          startsAt: "18:30",
          endsAt: "20:30",
          title: "Sunset SUP — Koa SUP & Kayak / Zooty in Seoul",
          titleKr: "쥬티 인 서울",
          address: "Windsurfing Club No. 25, 2326 Gangbyeonbuk-ro, Gwangjin-gu, Seoul",
          addressKr: "서울특별시 광진구 강변북로 2326, 서울윈드서핑장 25호",
          cost: "US$27.05 per person",
          bookingUrl: "https://www.klook.com/",
          details: "Book: Klook — Sunset SUP",
        },
        { startsAt: "21:00", title: "Dinner around Konkuk University", titleKr: "건대" },
      ],
    },
    {
      date: "2026-08-03",
      title: "Historic Seoul + shopping + Namsan",
      city: "Seoul",
      items: [
        {
          startsAt: "09:50",
          endsAt: "12:00",
          title: "Gyeongbokgung Palace",
          titleKr: "경복궁",
          details:
            "공덕역 → 광화문역 2번 출구 → 광화문 → 경복궁. 10:00 Royal Guard Changing Ceremony, then the palace.",
          cost: "₩3,000 per person",
        },
        {
          startsAt: "12:00",
          endsAt: "12:45",
          title: "Gwanghwamun Square",
          titleKr: "광화문광장",
        },
        {
          startsAt: "13:00",
          endsAt: "15:50",
          title: "Lotte and Shinsegae Department Stores",
          titleKr: "롯데백화점·신세계백화점",
          details: "Lunch and shopping.",
        },
        {
          startsAt: "16:10",
          endsAt: "18:30",
          title: "Namsan and N Seoul Tower",
          titleKr: "남산·N서울타워",
          details: "신세계백화점 본점 → 남산오르미 → 남산 → N서울타워",
        },
        {
          startsAt: "18:45",
          endsAt: "20:15",
          title: "Myeongdong",
          titleKr: "명동",
          details: "Dinner and evening walk.",
        },
      ],
    },
    {
      date: "2026-08-04",
      title: "Jeju + Wind 1947 + Bayern match",
      city: "Jeju",
      items: [
        { startsAt: "06:15", title: "Leave home", details: "삼부골든타워 → 인천국제공항" },
        { startsAt: "07:35", title: "Incheon Airport", titleKr: "인천공항" },
        { startsAt: "09:45", endsAt: "11:00", title: "Flight to Jeju", titleKr: "제주국제공항" },
        { startsAt: "11:00", endsAt: "11:40", title: "Luggage collection" },
        {
          startsAt: "11:40",
          endsAt: "12:50",
          title: "Casaloma Hotel — TAXI",
          titleKr: "까사로마호텔",
          address: "347 Taepyeong-ro, Seogwipo-si, Jeju-do",
          addressKr: "제주특별자치도 서귀포시 태평로 347",
          details: "Leave luggage at reception.",
        },
        {
          startsAt: "13:00",
          endsAt: "13:50",
          title: "Lunch at Seogwipo Maeil Olle Market",
          titleKr: "서귀포매일올레시장",
        },
        {
          startsAt: "14:20",
          endsAt: "15:30",
          title: "Wind 1947 Kart Theme Park",
          titleKr: "윈드1947 카트 테마파크",
          address: "78-27 Topyeonggongdan-ro, Seogwipo-si, Jeju-do",
          addressKr: "제주특별자치도 서귀포시 토평공단로 78-27",
        },
        { startsAt: "15:50", endsAt: "16:40", title: "Check-in and rest" },
        {
          startsAt: "16:40",
          endsAt: "17:20",
          title: "Early dinner in downtown Seogwipo",
          titleKr: "서귀포 시내",
        },
        {
          startsAt: "17:30",
          endsAt: "19:40",
          title: "Jeju World Cup Stadium",
          titleKr: "제주월드컵경기장",
          address: "33 World Cup-ro, Seogwipo-si, Jeju-do",
          addressKr: "제주특별자치도 서귀포시 월드컵로 33",
          details: "Entry and pre-match time.",
        },
        { startsAt: "20:00", endsAt: "22:00", title: "Jeju SK FC vs FC Bayern Munich" },
        {
          startsAt: "22:15",
          endsAt: "23:00",
          title: "Return to Casaloma Hotel — TAXI",
          titleKr: "까사로마호텔",
        },
      ],
    },
    {
      date: "2026-08-05",
      title: "Hallasan + Jungmun Beach",
      city: "Jeju",
      items: [
        {
          startsAt: "07:00",
          endsAt: "07:40",
          title: "Breakfast and preparation",
          titleKr: "까사로마호텔",
        },
        {
          startsAt: "07:45",
          title: "Yeongsil Rest Area — TAXI",
          titleKr: "영실휴게소",
          address: "246 Yeongsil-ro, Seogwipo-si, Jeju-do",
          addressKr: "제주특별자치도 서귀포시 영실로 246",
          details:
            "Journey 35–45 min. Enter 영실휴게소, NOT 영실매표소. Arrange the return taxi before starting.",
          cost: "₩30,000–40,000",
        },
        {
          startsAt: "08:25",
          endsAt: "10:15",
          title: "Yeongsil Trail",
          titleKr: "영실코스",
          details: "영실휴게소 → 병풍바위 → 선작지왓 → 윗세오름",
        },
        {
          startsAt: "10:15",
          endsAt: "10:35",
          title: "Witseoreum Shelter",
          titleKr: "윗세오름대피소",
          details:
            "Food, rest and route decision. Short-route pickup 12:15 · full-route pickup 14:30.",
        },
        {
          startsAt: "10:35",
          endsAt: "14:30",
          title: "Full route — South Wall Junction and back",
          titleKr: "남벽분기점",
          details:
            "윗세오름 → 방아오름샘 → 남벽분기점 → 윗세오름 → 선작지왓 → 영실휴게소. Distance 11.6 km, admission free.",
          optionGroup: "aug5-hallasan",
          optionLabel: "Full route (11.6 km)",
        },
        {
          startsAt: "10:35",
          endsAt: "12:15",
          title: "Short route — straight back down",
          details: "윗세오름 → 선작지왓 → 영실휴게소. Skips 남벽분기점.",
          optionGroup: "aug5-hallasan",
          optionLabel: "Short route",
        },
        {
          startsAt: "16:45",
          endsAt: "18:30",
          title: "Jungmun Saekdal Beach",
          titleKr: "중문색달해수욕장",
          address: "100 Jungmungwangwang-ro 72beon-gil, Seogwipo-si, Jeju-do",
          addressKr: "제주특별자치도 서귀포시 중문관광로72번길 100",
          details: "Finish swimming by 18:15. Admission free.",
        },
        {
          startsAt: "19:00",
          endsAt: "20:15",
          title: "Dinner at Seogwipo Maeil Olle Market",
          titleKr: "서귀포매일올레시장",
          address: "18 Jungang-ro 62beon-gil, Seogwipo-si, Jeju-do",
          addressKr: "제주특별자치도 서귀포시 중앙로62번길 18",
        },
        {
          startsAt: "20:15",
          endsAt: "21:15",
          title: "Evening walk",
          details: "서귀포매일올레시장 → 이중섭거리 → 서귀포항",
        },
      ],
    },
    {
      date: "2026-08-06",
      title: "Udo + Seongsan Ilchulbong",
      city: "Jeju",
      items: [
        { startsAt: "07:30", endsAt: "08:00", title: "Breakfast, pack and check out" },
        {
          startsAt: "08:05",
          endsAt: "09:10",
          title: "The Best Jeju Seongsan — TAXI",
          titleKr: "더베스트 제주 성산",
          address: "26 Dongnyuam-ro, Seongsan-eup, Seogwipo-si, Jeju-do",
          addressKr: "제주특별자치도 서귀포시 성산읍 동류암로 26",
          cost: "₩45,000–60,000",
          details: "Leave luggage at reception.",
        },
        {
          startsAt: "09:30",
          endsAt: "16:15",
          title: "Seongsan Port + Udo",
          titleKr: "성산포항 · 우도",
          details:
            "Ferry to Udo → sightseeing bus → 서빈백사 → 우도봉·검멀레해변 → lunch → 하고수동해수욕장 → ferry back. BRING PASSPORTS.",
          cost: "Ferry ₩11,000 return · sightseeing bus ₩10,000–11,000 per person",
        },
        { startsAt: "16:30", endsAt: "17:20", title: "Check in, shower and change" },
        { startsAt: "17:20", endsAt: "18:10", title: "Early dinner in Seongsan", titleKr: "성산" },
        {
          startsAt: "18:20",
          endsAt: "19:55",
          title: "Seongsan Ilchulbong",
          titleKr: "성산일출봉",
          address: "284-12 Ilchul-ro, Seongsan-eup, Seogwipo-si, Jeju-do",
          addressKr: "제주특별자치도 서귀포시 성산읍 일출로 284-12",
          details: "Summit climb, sunset and descent. Sunset 19:30.",
          cost: "₩5,000 per person",
        },
        { startsAt: "20:00", title: "Seongsan evening — walk, drinks and food", titleKr: "성산" },
      ],
    },
    {
      date: "2026-08-07",
      title: "Jeju → baseball → Itaewon",
      city: "Seoul",
      items: [
        {
          startsAt: "08:30",
          endsAt: "09:30",
          title: "Breakfast and check-out",
          details: "No sunrise mission.",
        },
        { startsAt: "09:45", title: "Jeju Airport — TAXI", titleKr: "제주공항" },
        { startsAt: "12:45", endsAt: "14:00", title: "Flight to Gimpo", titleKr: "김포" },
        {
          startsAt: "14:30",
          endsAt: "15:30",
          title: "Return home",
          details: "김포공항역 → 공덕역",
        },
        { startsAt: "15:30", endsAt: "16:40", title: "Luggage, shower and food" },
        {
          startsAt: "18:30",
          endsAt: "21:30",
          title: "Jamsil Baseball Stadium — KIA Tigers vs LG Twins",
          titleKr: "잠실야구장",
          details: "공덕역 → 종합운동장역 5번 출구",
        },
        { startsAt: "22:30", title: "Itaewon — drinks and clubbing", titleKr: "이태원" },
      ],
    },
    {
      date: "2026-08-08",
      title: "Mangwon + Haneul Park + Hangang",
      city: "Seoul",
      items: [
        { startsAt: "11:00", title: "Wake up" },
        {
          startsAt: "12:00",
          endsAt: "13:30",
          title: "Mangwon Market + Mangwon-dong",
          titleKr: "망원시장·망원동",
          details: "Lunch and market shopping.",
        },
        {
          startsAt: "14:00",
          endsAt: "15:30",
          title: "Haneul Park",
          titleKr: "하늘공원",
          details:
            "월드컵경기장역 1번 출구 → 하늘공원. Use the 맹꽁이 전기차 shuttle uphill if operating, otherwise the stairs. Admission free.",
        },
        {
          startsAt: "15:30",
          endsAt: "16:30",
          title: "Move to Mangwon Pier",
          titleKr: "망원 선착장",
          details: "Collect the boarding number immediately after arriving.",
        },
        {
          startsAt: "17:04",
          endsAt: "17:25",
          title: "Hangang Bus",
          titleKr: "한강버스",
          details: "망원 선착장 → 여의도 선착장",
          cost: "₩3,000 per person",
        },
        { startsAt: "17:35", endsAt: "18:20", title: "The Hyundai Seoul", titleKr: "더현대 서울" },
        {
          startsAt: "19:00",
          endsAt: "22:00",
          title: "Hangang Silent DJ Party",
          titleKr: "한강무소음DJ파티",
          details: "여의도한강공원 마포대교 하부 (Yeouido Hangang Park, beneath Mapo Bridge)",
          cost: "₩9,000 per person",
        },
      ],
    },
    {
      date: "2026-08-09",
      title: "Achasan + Jamsil",
      city: "Seoul",
      items: [
        { startsAt: "11:15", title: "Leave home" },
        {
          startsAt: "12:15",
          endsAt: "14:30",
          title: "Achasan",
          titleKr: "아차산",
          details:
            "Start: 광나루역 1번 출구 → 아차산생태공원 → 고구려정 → 해맞이광장 → 아차산 1보루 → 아차산생태공원 → 광나루역",
        },
        {
          startsAt: "15:15",
          endsAt: "16:45",
          title: "Songridan-gil",
          titleKr: "송리단길",
          details: "Late lunch. Start: 석촌역 2번 출구.",
        },
        {
          startsAt: "16:45",
          endsAt: "18:00",
          title: "Seokchon Lake",
          titleKr: "석촌호수",
          details: "송리단길 → 석촌호수 동호 → 석촌호수 서호",
        },
        {
          startsAt: "18:00",
          endsAt: "20:15",
          title: "Lotte World Mall",
          titleKr: "롯데월드몰",
          details: "Shopping.",
        },
        { startsAt: "20:15", title: "Jamsil — dinner and drinks", titleKr: "잠실" },
      ],
    },
    {
      date: "2026-08-10",
      title: "Seoul → Yangyang",
      city: "Yangyang",
      items: [
        { startsAt: "06:45", title: "Wake up" },
        { startsAt: "07:30", title: "Leave home" },
        {
          startsAt: "08:30",
          endsAt: "10:49",
          title: "Seoul → Yangyang",
          details: "서울고속버스터미널 → 양양종합여객터미널",
          cost: "₩19,900 per person",
        },
        {
          startsAt: "11:00",
          endsAt: "11:30",
          title: "Naksan Beach",
          titleKr: "낙산해수욕장",
          details: "Leave luggage at the accommodation.",
          cost: "Local bus ₩1,700 pp · taxi ₩6,000–8,000",
        },
        { startsAt: "12:00", endsAt: "13:00", title: "Lunch" },
        {
          startsAt: "13:30",
          endsAt: "16:30",
          title: "Surfing — Yangyang Surfing School",
          titleKr: "양양서핑학교",
          details: "Beginner lesson, then free surfing and shower. Board and wetsuit included.",
          cost: "₩80,000 per person",
        },
        { startsAt: "17:00", title: "Check-in and rest" },
        {
          startsAt: "19:00",
          title: "Naksan Beach — dinner and beach walk",
          titleKr: "낙산해수욕장",
          details: "Early sleep before 울산바위.",
        },
      ],
    },
    {
      date: "2026-08-11",
      title: "Ulsanbawi → Seoul",
      city: "Yangyang",
      items: [
        { startsAt: "06:15", title: "Wake up, breakfast and check-out" },
        {
          startsAt: "07:00",
          endsAt: "07:30",
          title: "Seoraksan Sogongwon — TAXI",
          titleKr: "설악산소공원",
          cost: "₩25,000–35,000 per car",
        },
        {
          startsAt: "07:30",
          endsAt: "12:00",
          title: "Ulsanbawi",
          titleKr: "울산바위",
          details:
            "설악산소공원 → 신흥사 → 흔들바위·계조암 → 울산바위 → 설악산소공원. 7.6 km return, admission free. Carry our overnight bags during the hike.",
        },
        {
          startsAt: "12:00",
          endsAt: "12:30",
          title: "Sokcho Express Bus Terminal — TAXI",
          titleKr: "속초고속버스터미널",
          cost: "₩15,000–20,000 per car",
        },
        { startsAt: "12:30", endsAt: "13:40", title: "Lunch and change clothes" },
        {
          startsAt: "14:00",
          endsAt: "17:13",
          title: "Sokcho → Seoul",
          details: "속초고속버스터미널 → 서울고속버스터미널",
          cost: "₩22,300 per person",
        },
        { startsAt: "18:00", title: "Return home" },
      ],
    },
    {
      date: "2026-08-12",
      title: "Caribbean Bay + Everland",
      city: "Seoul",
      items: [
        { startsAt: "07:30", title: "Wake up" },
        { startsAt: "08:15", title: "Leave home" },
        {
          startsAt: "10:00",
          endsAt: "15:30",
          title: "Caribbean Bay",
          titleKr: "캐리비안 베이",
          address: "199 Everland-ro, Pogog-eup, Cheoin-gu, Yongin-si, Gyeonggi-do",
          addressKr: "경기도 용인시 처인구 포곡읍 에버랜드로 199",
          details:
            "공덕역 → 강남역 → 5002A·5002B → 에버랜드. Lunch, shower and change before leaving.",
          cost: "₩49,900 per person — Gold Season all-day pass",
        },
        {
          startsAt: "15:30",
          endsAt: "22:00",
          title: "Everland",
          titleKr: "에버랜드",
          details:
            "Priorities: 모니모 러시 · 롤링 엑스 트레인 · 허리케인 · 더블락스핀 · 렛츠 트위스트 · 아마존 익스프레스 · 썬더폴스. 사파리월드/로스트밸리/판다월드 optional depending on queues. Use the Everland app's live waiting times instead of a fixed ride order. Dinner inside.",
          cost: "₩79,900 for two — two-person all-day pass",
        },
        {
          startsAt: "22:00",
          title: "Leave Everland",
          details: "에버랜드 → 5002B → 강남역 → 공덕역",
        },
      ],
    },
    {
      date: "2026-08-13",
      title: "Gwanaksan",
      city: "Seoul",
      items: [
        { startsAt: "07:45", title: "Wake up" },
        { startsAt: "08:30", title: "Leave home" },
        {
          startsAt: "09:30",
          endsAt: "14:30",
          title: "Gwanaksan",
          titleKr: "관악산",
          details:
            "사당역 4번 출구 → 관음사 → 마당바위 → 관악문 → 연주대 → 자운암능선 → 서울대학교 건설환경종합연구소. 7.3 km, admission free. Sadang Ridge gives the open Seoul views; the shorter SNU descent avoids continuing through the park.",
        },
        {
          startsAt: "15:15",
          endsAt: "17:30",
          title: "Sharosu-gil",
          titleKr: "샤로수길",
          details:
            "건설환경종합연구소 → 제2공학관 정류장 → 5513 → 서울대입구역. Walk ~300 m uphill to the stop before boarding. Late lunch and drinks.",
        },
        {
          startsAt: "17:30",
          title: "Flexible evening",
          details: "Return home and rest, or continue elsewhere depending on energy.",
        },
      ],
    },
    {
      date: "2026-08-14",
      title: "Sogang University, Yeonnam-dong and Sinchon",
      city: "Seoul",
      items: [
        { title: "Sleep and pack", details: "Morning." },
        {
          startsAt: "12:00",
          endsAt: "15:30",
          title: "Sogang University + Sinchon",
          titleKr: "서강대학교·신촌",
          details: "Lunch and an easy walk around the university and Sinchon.",
        },
        {
          startsAt: "15:30",
          endsAt: "18:30",
          title: "Gyeongui Line Forest Park + Yeonnam-dong",
          titleKr: "경의선숲길·연남동",
          details: "Easy walk, shops and cafés.",
        },
        {
          startsAt: "18:30",
          endsAt: "20:30",
          title: "Sinchon shopping",
          titleKr: "신촌 쇼핑",
          details: "현대백화점 신촌점·유플렉스",
        },
        { startsAt: "20:30", endsAt: "22:00", title: "Dinner in Sinchon", titleKr: "신촌" },
        { startsAt: "22:00", title: "Return home and finish packing" },
      ],
    },
    {
      date: "2026-08-15",
      title: "Departure",
      city: "Seoul",
      items: [
        {
          startsAt: "06:45",
          title: "Wake up",
          details: "Breakfast, shower, final packing and apartment check.",
        },
        { startsAt: "07:40", title: "Check out and leave home" },
        {
          startsAt: "07:40",
          endsAt: "08:00",
          title: "Walk to Mapo Station · Seoul Garden Hotel bus stop",
          details: "Use the airport-bound stop OPPOSITE Seoul Garden Hotel.",
        },
        {
          startsAt: "08:00",
          endsAt: "09:20",
          title: "Mapo → Incheon Airport Terminal 1",
          details:
            "Airport Limousine 6015. No reservation required. Pay the driver by T-money or cash.",
          cost: "₩17,000 per person",
        },
        { startsAt: "09:20", endsAt: "12:15", title: "Airport procedures" },
        { startsAt: "13:05", title: "Departure from Incheon Airport Terminal 1" },
      ],
    },
  ],
};
