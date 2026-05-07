export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    ResetPassword: { email: string };
};

export type AppTabParamList = {
    Dashboard: undefined;
    Transactions: undefined;
    Banks: undefined;
    More: undefined;
    Installments: undefined;
    Subscriptions: undefined;
    CreditCardBills: undefined;
    Import: undefined;
    Categories: undefined;
};
