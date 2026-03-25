export interface MembershipData {
  id: string;
  hostId: string;
  name: string;
  price: string;
  type: string;
  subscriptionType: string;
  duration: string;
  durationUnit: string;
}

export class CSVParser {
  private memberships: Map<string, MembershipData> = new Map();

  parseCSVString(csvContent: string): void {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i += 1) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length < headers.length) {
        continue;
      }

      const membership: Record<string, string> = {};
      headers.forEach((header, index) => {
        membership[header] = values[index];
      });

      if (membership.id && membership.name) {
        this.memberships.set(membership.name.toLowerCase().trim(), {
          id: membership.id,
          hostId: membership.hostId,
          name: membership.name,
          price: membership.price,
          type: membership.type,
          subscriptionType: membership.subscriptionType,
          duration: membership.duration,
          durationUnit: membership.durationUnit,
        });
      }
    }

    console.log(`✓ Parsed ${this.memberships.size} memberships from CSV`);
  }

  parseCSV(csvContent: string): void {
    this.parseCSVString(csvContent);
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  findMembershipByName(productName: string): MembershipData | null {
    return this.memberships.get(productName.toLowerCase().trim()) || null;
  }

  findMembershipByPartialName(partialName: string): MembershipData | null {
    const normalizedPartial = partialName.toLowerCase().trim();

    for (const [name, membership] of this.memberships.entries()) {
      if (name.includes(normalizedPartial) || normalizedPartial.includes(name)) {
        return membership;
      }
    }

    return null;
  }

  getAllMemberships(): MembershipData[] {
    return Array.from(this.memberships.values());
  }
}
