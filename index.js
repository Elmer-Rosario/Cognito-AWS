global.fetch = require('node-fetch')
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));
const poolData = {
  UserPoolId: 'us-east-1_bzewJJvhX',
  ClientId: '88lj6rgjuit71beo84i4grqu2',
}
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);


app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const authenticationData = {
    Username: username,
    Password: password,
  }
  const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
  const userData = {
    Username: username,
    Pool: userPool,
  }

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: (result) => {
      const accessToken = result.getIdToken().getJwtToken();
      console.log(accessToken);
      res.status(200).json(accessToken);
    },
    onFailure: (err) => {
      //docs.send(err.message || JSON.stringify(err));
      console.log(err);
      res.status(401);
    }
  });
});

// method  post register users //
app.post('/registry', async (req, res) => {

  const user = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  if (password != confirmPassword) {
    res.status(502).json({ Error: 'the passwords do not match, enter the same password please' })
  } else {
    const attributeList = [];
    const dataEmail = {
      Name: 'email',
      Value: email,
    };

    const dataPersonalName = {
      Name: 'name',
      Value: user,
    };

    var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
    var attributePersonalName = new AmazonCognitoIdentity.CognitoUserAttribute(dataPersonalName);

    attributeList.push(attributeEmail);
    attributeList.push(attributePersonalName);

    await userPool.signUp(user, password, attributeList, null, (err, result) => {
      if (err) {
        res.status(400).json(err);
        return;
      }
      cognitoUser = result.user;
      console.log('user name is ' + cognitoUser.getUsername());
      res.status(200).json(cognitoUser)
    });
  }
})

//////////method post verification ///////////////
app.post('/verification', async (req, res) => {
  const usern = req.body.username;
  const code = req.body.code;

  const userData1 = {
    Username: usern,
    Pool: userPool
  };

  const cognitoUser1 = new AmazonCognitoIdentity.CognitoUser(userData1);
  await cognitoUser1.confirmRegistration(code, true, (err, result) => {
    if (err) {
      res.status(400).json(err);
      return;
    }
    res.status(200).json(result);
  });
})


module.exports.login = serverless(app);