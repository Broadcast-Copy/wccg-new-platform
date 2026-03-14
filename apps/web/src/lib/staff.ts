// ---------------------------------------------------------------------------
// staff.ts — Shared staff directory seed data
// ---------------------------------------------------------------------------

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: "operations" | "sales" | "programming" | "promotions" | "engineering" | "management" | "traffic";
  email: string;
  phone: string;
  extension: string;
  status: "active" | "on-leave" | "remote";
  hireDate: string;
  avatar?: string;
}

export const SEED_STAFF: StaffMember[] = [
  { id: "s1", name: "Marcus Thompson", role: "General Manager", department: "management", email: "marcus@wccg1045fm.com", phone: "(910) 555-1001", extension: "101", status: "active", hireDate: "2018-03-15" },
  { id: "s2", name: "Keisha Williams", role: "Program Director", department: "programming", email: "keisha@wccg1045fm.com", phone: "(910) 555-1002", extension: "102", status: "active", hireDate: "2019-06-01" },
  { id: "s3", name: "Devon Robinson", role: "Operations Manager", department: "operations", email: "devon@wccg1045fm.com", phone: "(910) 555-1003", extension: "103", status: "active", hireDate: "2020-01-10" },
  { id: "s4", name: "Angela Davis", role: "General Sales Manager", department: "sales", email: "angela@wccg1045fm.com", phone: "(910) 555-1004", extension: "104", status: "active", hireDate: "2019-09-22" },
  { id: "s5", name: "James Carter", role: "Chief Engineer", department: "engineering", email: "james@wccg1045fm.com", phone: "(910) 555-1005", extension: "105", status: "active", hireDate: "2017-11-01" },
  { id: "s6", name: "Sarah Mitchell", role: "Traffic/Office Manager", department: "traffic", email: "sarah@wccg1045fm.com", phone: "(910) 555-1006", extension: "106", status: "active", hireDate: "2021-02-14" },
  { id: "s7", name: "Brandon Lee", role: "Promotions Director", department: "promotions", email: "brandon@wccg1045fm.com", phone: "(910) 555-1007", extension: "107", status: "active", hireDate: "2020-08-03" },
  { id: "s8", name: "Tanya Brooks", role: "Sales Executive", department: "sales", email: "tanya@wccg1045fm.com", phone: "(910) 555-1008", extension: "108", status: "active", hireDate: "2022-04-15" },
  { id: "s9", name: "Chris Morgan", role: "Production Director", department: "operations", email: "chris@wccg1045fm.com", phone: "(910) 555-1009", extension: "109", status: "active", hireDate: "2021-07-20" },
  { id: "s10", name: "Lisa Henderson", role: "Sales Executive", department: "sales", email: "lisa@wccg1045fm.com", phone: "(910) 555-1010", extension: "110", status: "remote", hireDate: "2023-01-08" },
  { id: "s11", name: "DJ Smooth", role: "On-Air Host", department: "programming", email: "djsmooth@wccg1045fm.com", phone: "(910) 555-1011", extension: "111", status: "active", hireDate: "2019-03-01" },
  { id: "s12", name: "Lady Soul", role: "On-Air Host", department: "programming", email: "ladysoul@wccg1045fm.com", phone: "(910) 555-1012", extension: "112", status: "active", hireDate: "2020-06-15" },
  { id: "s13", name: "DJ Quick", role: "On-Air Host", department: "programming", email: "djquick@wccg1045fm.com", phone: "(910) 555-1013", extension: "113", status: "active", hireDate: "2021-01-10" },
  { id: "s14", name: "Mike Johnson", role: "Traffic Coordinator", department: "traffic", email: "mike@wccg1045fm.com", phone: "(910) 555-1014", extension: "114", status: "active", hireDate: "2022-09-01" },
  { id: "s15", name: "Patricia Young", role: "Office Assistant", department: "traffic", email: "patricia@wccg1045fm.com", phone: "(910) 555-1015", extension: "115", status: "active", hireDate: "2023-05-20" },
];

export function getStaffByDepartment(dept: StaffMember["department"]): StaffMember[] {
  return SEED_STAFF.filter((s) => s.department === dept);
}

export function getStaffById(id: string): StaffMember | undefined {
  return SEED_STAFF.find((s) => s.id === id);
}
