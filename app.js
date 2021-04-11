"use strict"

//Express and GraphQL requirements
const express = require("express");
const bodyParser = require("body-parser");
const graphQLHTTP = require("express-graphql");
const { buildSchema } = require("graphql");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dburi = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@appointments.hxov7.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`;
const Event = require("./models/event");
const User = require("./models/user");

const app = express();

app.use(bodyParser.json());

//Define GraphQL API
app.use('/api', graphQLHTTP.graphqlHTTP({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type User {
            _id: ID!
            email: String!
            password: String
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        input UserInput {
            email: String!
            password: String!
        }

        type RootQuery {
            events: [Event!]!
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }
    
        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    
    rootValue: {
        events: () => {
            return Event.find().then(events => {
                return events.map(event => {
                    return {...event._doc, _id: event.id};
                })
            }).catch(err => {
                throw err;
            });
        },
        createEvent: (args) => {
            const event = new Event({
                title: args.eventInput.title,
                description: args.eventInput.description,
                price: +args.eventInput.price,
                date: new Date(args.eventInput.date)
            });

            return event.save().then(result => {
                console.log(result);
                return {... result._doc, _id: event.id};
            }).catch(err => {
                console.log(err);
                throw err;
            });
        },
        createUser: (args) => {
            // Must return so GraphQL knows to wait for async to finish
            return bcrypt.hash(args.userInput.password, 12).then(hashedPassword => {
                const user = new User({
                    email: args.userInput.email,
                    password: args.hashedPassword
                });
                return user.save();
            }).then(result => {
                return {... result._doc, _id: result.id}
            }).catch(err => {
                throw err;
            });
            
        }
    },
    graphiql: true //Debugging
}));

mongoose.connect(dburi, {useNewUrlParser: true, useUnifiedTopology: true}).then(() => {
    app.listen(3000);
}).catch(err => {
    console.log(err);
});