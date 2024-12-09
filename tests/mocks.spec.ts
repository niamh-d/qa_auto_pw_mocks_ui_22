import {test, expect} from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Read from ".env.development" file.
dotenv.config({path: path.resolve(__dirname, '.env.development')});

const token = process.env.TOKEN as string
const loginRouteMock = '**/login/student'
const orderRouteMock = '**/orders'
const orderNumber = 3170
const orderObject = {
    id: orderNumber,
    status: "OPEN",
    courierId: 123456,
    customerName: "Jane",
    customerPhone: "1-270-523-35",
    comment: "urgent"
}
const orderBody = JSON.stringify(orderObject)

test.describe('mocks', () => {

    test.describe('mocking order creation and order search', () => {

        test.beforeEach(async ({page}) => {
            await page.goto('/signin');
            await page.getByTestId('username-input').fill('test-user')
            await page.getByPlaceholder('Password').fill('password')

            await page.route(loginRouteMock, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: token
                });
            });

            await page.getByRole('button', {name: 'Sign in'}).click()
        })

        test('order creation', async ({page}) => {

            await page.getByTestId('username-input').fill('test');
            await page.getByTestId('phone-input').fill('00000000');
            await page.getByTestId('comment-input').fill('test');

            await page.route(orderRouteMock, async (route) => {

                await route.fulfill({
                    status: 200,
                    body: orderBody
                });
            });

            const orderCreatedPopup = page.getByTestId('orderSuccessfullyCreated-popup-ok-button')
            await page.getByTestId('createOrder-button').click({force: true});
            await expect.soft(orderCreatedPopup).toBeVisible()
            await orderCreatedPopup.click({force: true});
        });

        test('order search', async ({page}) => {

            await page.route(`${orderRouteMock}/**`, async (route) => {

                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(
                        {
                            ...orderObject,
                            status: "ACCEPTED"
                        }
                    )
                });
            });

            await page.getByTestId('openStatusPopup-button').click();
            await page.getByTestId('searchOrder-input').fill('00000000');
            await page.getByTestId('searchOrder-submitButton').click();
            await page.waitForResponse(`${orderRouteMock}/**`)
            expect.soft(page.getByRole('heading', {name: 'Order has been delivered'})).toBeVisible()
        });

        test('invalid backend response', async ({page}) => {

            await page.route(`${orderRouteMock}/**`, async (route) => {

                await route.fulfill({
                    status: 500,
                    body: orderBody
                });
            });

            await page.getByTestId('openStatusPopup-button').click();
            await page.getByTestId('searchOrder-input').fill(orderNumber.toString());
            await page.getByTestId('searchOrder-submitButton').click();
            await page.waitForResponse(`${orderRouteMock}/**`)
            const notFoundContainer = page.getByTestId('orderNotFound-container')
            expect.soft(notFoundContainer).toBeVisible()
        });
    })

    test.describe('authorization', () => {

        test('token saved to local storage', async ({context}) => {

            await context.addInitScript(() => {
                localStorage.setItem('jwt', 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJuaWFtaC1jcmR0IiwiZXhwIjoxNzMzNzYyMjU3LCJpYXQiOjE3MzM3NDQyNTd9.yweK5Xi86Sxjx684aeS1l6Mq51vJSGvzyVSs8UIhDSv71vG3bgIQ7RuPf5rIKET67z0xVr7g3XC6zdaUOyy5QQ');
            });

            const page = await context.newPage()
            await page.goto('/signin');
            await expect.soft(page.getByRole('button', {name: 'Order'})).toBeVisible()
        });
    })
})