import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { verifyFirebaseIdToken } from "../../common/lib/firebase-admin";
import { getMembershipsForEmail, findMembership } from "../../common/lib/memberships";
import { SessionService } from "./session.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async signIn(idToken: string, requestedVendorId: string | undefined) {
    const verified = await verifyFirebaseIdToken(idToken);
    // Unverified Google addresses are rejected outright — CLAUDE.md § Auth
    // Rules: the email allowlist is only meaningful if the address is proven.
    if (!verified || !verified.emailVerified) {
      throw new UnauthorizedException({
        error: "Google sign-in could not be verified",
        code: "invalid_token",
      });
    }

    const memberships = await getMembershipsForEmail(verified.email);
    if (memberships.length === 0) {
      throw new ForbiddenException({
        error: "This Google account isn't linked to a Booktns staff account. Ask your vendor owner to add you.",
        code: "not_registered",
      });
    }

    // A requested vendor is honoured only when this email genuinely has an
    // active membership there — the id arrives from the client, so it is a
    // request, never an assertion.
    const requested = requestedVendorId ? memberships.find((m) => m.vendorId === requestedVendorId) : undefined;
    const membership = requested ?? memberships[0];

    const staff = await this.prisma.staff.findUnique({
      where: { id: membership.staffId },
      select: { id: true, vendorId: true, name: true, role: true, email: true, vendor: { select: { name: true } } },
    });
    if (!staff) {
      throw new ForbiddenException({ error: "Staff account not found", code: "not_registered" });
    }

    return { token: await this.sessions.issueStaffToken(staff), memberships };
  }

  async memberships(email: string) {
    return { memberships: await getMembershipsForEmail(email) };
  }

  async switchVendor(email: string, vendorId: string) {
    // Re-derived from the database on every call rather than trusting a list
    // handed to the client at sign-in: access can be revoked between page
    // loads, and this cookie is what every other guard trusts.
    const membership = await findMembership(email, vendorId);
    if (!membership) {
      // Same message whether the vendor doesn't exist or this person isn't
      // on it — a signed-in user shouldn't be able to probe vendor ids.
      throw new ForbiddenException({ error: "You don't have access to that shop", code: "forbidden" });
    }

    const staff = await this.prisma.staff.findUnique({
      where: { id: membership.staffId },
      select: { id: true, vendorId: true, name: true, role: true, email: true, vendor: { select: { name: true } } },
    });
    if (!staff) {
      throw new ForbiddenException({ error: "You don't have access to that shop", code: "forbidden" });
    }

    return { token: await this.sessions.issueStaffToken(staff), vendorId: staff.vendorId, role: staff.role };
  }
}
