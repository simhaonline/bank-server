import { Injectable } from '@nestjs/common';
import { AccountBillNumberGenerationIncorrect } from 'exceptions/account-bill-number-generation-incorrect.exception';
import { BillRepository } from 'modules/bill/repositories';
import { CurrencyService } from 'modules/currency/services';
import { UtilsService } from 'providers';

import { BillEntity } from '../entities';

@Injectable()
export class BillService {
    constructor(
        private readonly _billRepository: BillRepository,
        private readonly _currencyService: CurrencyService,
    ) {}

    public async createAccountBill(createdUser): Promise<BillEntity[]> {
        const accountBillNumber = await this._createAccountBillNumber();
        const currency = await this._currencyService.findCurrencyByName({
            name: createdUser.currencyName,
        });

        const createdBill = { ...createdUser, accountBillNumber, currency };
        const bill = this._billRepository.create(createdBill);

        return this._billRepository.save(bill);
    }

    private async _createAccountBillNumber(): Promise<string> {
        const accountBillNumber = this._generateAccountBillNumber();
        const billEntity = await this._findAccountBillByAccountBillNumber({
            accountBillNumber,
        });

        try {
            return billEntity
                ? await this._createAccountBillNumber()
                : accountBillNumber;
        } catch (error) {
            throw new AccountBillNumberGenerationIncorrect(error);
        }
    }

    private _generateAccountBillNumber(): string {
        const checkSum = UtilsService.generateRandomInteger(10, 99); // CC
        const bankOrganizationalUnitNumber = 28229297; // AAAA AAAA
        const customerAccountNumber = UtilsService.generateRandomInteger(
            1e15,
            9e15,
        ); // BBBB BBBB BBBB BBBB

        return `${checkSum}${bankOrganizationalUnitNumber}${customerAccountNumber}`;
    }

    private async _findAccountBillByAccountBillNumber(
        options: Partial<{ accountBillNumber: string }>,
    ): Promise<BillEntity | undefined> {
        const queryBuilder = this._billRepository.createQueryBuilder('bill');

        queryBuilder.where('bill.accountBillNumber = :accountBillNumber', {
            accountBillNumber: options.accountBillNumber,
        });

        return queryBuilder.getOne();
    }
}