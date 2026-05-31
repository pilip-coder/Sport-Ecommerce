<<<<<<< HEAD
import { AdminLoginDto } from "../dto/admin";
import { Payment } from "../Models/payment.model";
import { SafeUser, User } from "../Models/user.model";
import { PaymentRepository } from "../Repositories/payment.repository";
import { SessionRepository } from "../Repositories/session.repository";
import { UserRepository } from "../Repositories/user.repository";
import { OrderService } from "./order.service";
import { ProductListQuery, ProductService } from "./product.service";
import { AppError } from "../Core/errors";
import { requireString } from "../Core/utils";

interface AuthPayload {
  token: string;
  user: SafeUser;
}

const toSafeUser = (user: User): SafeUser => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  phone: user.phone,
  roleName: user.roleName,
  createdAt: user.createdAt,
});

export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
    private readonly paymentRepository: PaymentRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async login(payload: AdminLoginDto): Promise<AuthPayload> {
    const email = requireString(payload.email, "Email");
    const password = requireString(payload.password, "Password");
    const user = await this.userRepository.findByEmail(email);

    if (!user || user.password !== password || user.roleName !== "admin") {
      throw new AppError("Invalid admin credentials.", 401);
    }

    const token = await this.sessionRepository.createSession(user.id);
    return { token, user: toSafeUser(user) };
  }

  async getProfile(userId: number): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    return toSafeUser(user);
  }

  async listUsers(): Promise<SafeUser[]> {
    return (await this.userRepository.listUsers()).map(toSafeUser);
  }

  async listProducts(query: ProductListQuery) {
    return this.productService.listProducts({
      ...query,
      includeDrafts: query.includeDrafts ?? true,
    });
  }

  async getProduct(productId: number) {
    return this.productService.getProduct(productId);
  }

  async createProduct(payload: Parameters<ProductService["createProduct"]>[0]) {
    return this.productService.createProduct(payload);
  }

  async updateProduct(productId: number, payload: Parameters<ProductService["updateProduct"]>[1]) {
    return this.productService.updateProduct(productId, payload);
  }

  async updateProductStock(productId: number, quantity: number) {
    return this.productService.updateProductStock(productId, quantity);
  }

  async deleteProduct(productId: number): Promise<void> {
    await this.productService.deleteProduct(productId);
  }

  async listOrders() {
    return this.orderService.listOrders();
  }

  async getOrder(orderId: number) {
    return this.orderService.getOrder(orderId);
  }

  async listFinancialRecords(): Promise<Payment[]> {
    return this.paymentRepository.list();
  }

  async getFinancialSummary() {
    const payments = await this.paymentRepository.list();
    const totalRevenue = Number(
      payments.reduce((sum, payment) => sum + (payment.status === "paid" ? payment.amount : 0), 0).toFixed(2),
    );

    return {
      totalPayments: payments.length,
      totalRevenue,
      paidPayments: payments.filter((payment) => payment.status === "paid").length,
    };
  }
}
=======
import { AppError } from "../Core/errors";
import type {
  AdminListQueryDto,
  AdminUpdatePaymentStatusDto,
  AdminUpdateUserStatusDto,
} from "../dto/admin";
import {
  findAdminOrders,
  findAdminPayments,
  findAdminUsers,
  findFinancialSummary,
  updateAdminPaymentStatus,
  updateAdminUserStatus,
} from "../Repositories/admin.repository";

const toPositiveInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer.`, 400);
  }

  return parsed;
};

const normalizeSearch = (query: AdminListQueryDto): string | undefined => {
  const search = query.search?.trim();
  return search ? search : undefined;
};

export const listAdminUsers = async (query: AdminListQueryDto) => {
  return findAdminUsers(normalizeSearch(query));
};

export const changeAdminUserStatus = async (
  userIdValue: string,
  payload: AdminUpdateUserStatusDto,
): Promise<void> => {
  const userId = toPositiveInteger(userIdValue, "User id");

  if (payload.status !== "active" && payload.status !== "inactive") {
    throw new AppError("User status must be active or inactive.", 400);
  }

  const updated = await updateAdminUserStatus(userId, payload.status);
  if (!updated) {
    throw new AppError("User not found.", 404);
  }
};

export const removeAdminUser = async (userIdValue: string): Promise<void> => {
  const userId = toPositiveInteger(userIdValue, "User id");
  const updated = await updateAdminUserStatus(userId, "inactive");

  if (!updated) {
    throw new AppError("User not found.", 404);
  }
};

export const listAdminOrders = async (query: AdminListQueryDto) => {
  return findAdminOrders(normalizeSearch(query));
};

export const listAdminPayments = async (query: AdminListQueryDto) => {
  return findAdminPayments(normalizeSearch(query));
};

export const getAdminFinancialSummary = async () => {
  return findFinancialSummary();
};

export const changeAdminPaymentStatus = async (
  paymentIdValue: string,
  payload: AdminUpdatePaymentStatusDto,
): Promise<void> => {
  const paymentId = toPositiveInteger(paymentIdValue, "Payment id");
  const status = payload.status?.trim().toLowerCase();

  if (!status) {
    throw new AppError("Payment status is required.", 400);
  }

  const updated = await updateAdminPaymentStatus(paymentId, status);
  if (!updated) {
    throw new AppError("Payment not found.", 404);
  }
};
>>>>>>> 0c1e507d7c404effbb80ef5370c0532eb022a4b4
