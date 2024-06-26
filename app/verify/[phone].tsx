import {Text, View, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {Stack, useLocalSearchParams} from "expo-router";
import {useEffect, useState} from "react";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell
} from 'react-native-confirmation-code-field';
import Colors from "@/constants/Colors";
import {isClerkAPIResponseError, useSignIn, useSignUp} from "@clerk/clerk-expo";
import {PhoneCodeFactor, SignInFirstFactor} from "@clerk/types";

const CELL_COUNT = 6;

type LocalSearchParams = {
  phone: string,
  signin: string
}

const VerifyByPhone = () => {
  const { signIn } = useSignIn();
  const { signUp, setActive } = useSignUp();
  const { phone, signin } = useLocalSearchParams<LocalSearchParams>()
  const [code, setCode] = useState('');
  const ref = useBlurOnFulfill({value: code, cellCount: CELL_COUNT});
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  });

  const verifyCode = async (code: string) => {
    try {
      await signUp?.attemptPhoneNumberVerification({
        code
      })

      await setActive!({
        session: signUp!.createdSessionId
      })
    } catch (e) {
      console.log('Error: ', JSON.stringify(e, null, 2));
      if(isClerkAPIResponseError(e)) {
        Alert.alert('Error', e.errors[0].message);
      }
    }
  }

  const verifySignIn = async () => {
    try {
      await signIn!.attemptFirstFactor({
        strategy: 'phone_code',
        code,
      });

      await setActive!({ session: signIn!.createdSessionId });
    } catch (err) {
      console.log('error', JSON.stringify(err, null, 2));
      if (isClerkAPIResponseError(err)) {
        Alert.alert('Error', err.errors[0].message);
      }
    }
  };

  const resendCode = async () => {
    try {
      if (signin === 'true') {
        const { supportedFirstFactors } = await signIn!.create({
          identifier: phone,
        });

        const isPhoneCodeFactor = (
         factor: SignInFirstFactor
        ): factor is PhoneCodeFactor => {
          return factor.strategy === "phone_code";
        };

        const phoneCodeFactor = supportedFirstFactors?.find(isPhoneCodeFactor)!;

        const { phoneNumberId } = phoneCodeFactor;

        await signIn!.prepareFirstFactor({
          strategy: 'phone_code',
          phoneNumberId,
        });
      } else {
        await signUp!.create({
          phoneNumber: phone,
        });
        signUp!.preparePhoneNumberVerification();
      }
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        Alert.alert('Error', err.errors[0].message);
      }
    }
  };

  useEffect(() => {
    if (code.length === CELL_COUNT) {
      if (signin === 'true') {
        verifySignIn();
      } else {
        verifyCode(code);
      }
    }
  }, [code]);

  return (
   <View style={styles.container}>
     <Stack.Screen options={{
       headerTitle: phone
     }} />
     <Text style={styles.legal}>We have sent you an SMS with a code to the number above.</Text>
     <Text style={styles.legal}>
       To complete your phone number verification, please enter the 6-digit activation code.
     </Text>
     <CodeField
      ref={ref}
      {...props}
      value={code}
      onChangeText={setCode}
      cellCount={CELL_COUNT}
      rootStyle={styles.codeFieldRoot}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      renderCell={({ index, symbol, isFocused }) => (
       <View
        // Make sure that you pass onLayout={getCellOnLayoutHandler(index)} prop to root component of "Cell"
        onLayout={getCellOnLayoutHandler(index)}
        key={index}
        style={[styles.cellRoot, isFocused && styles.focusCell]}>
         <Text style={styles.cellText}>{symbol || (isFocused ? <Cursor /> : null)}</Text>
       </View>
      )}
     />
     <TouchableOpacity style={styles.button} onPress={resendCode}>
       <Text style={styles.buttonText}>
          Didn't receive the code?
       </Text>
     </TouchableOpacity>
   </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
    gap: 20,
  },
  legal: {
    fontSize: 14,
    textAlign: 'center',
    color: '#000',
  },
  button: {
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.primary,
    fontSize: 18,
  },
  codeFieldRoot: {
    marginTop: 20,
    width: 260,
    marginLeft: 'auto',
    marginRight: 'auto',
    gap: 4,
  },
  cellRoot: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  cellText: {
    color: '#000',
    fontSize: 36,
    textAlign: 'center',
  },
  focusCell: {
    paddingBottom: 4,
    borderBottomColor: '#000',
    borderBottomWidth: 1,
  },
});

export default VerifyByPhone;
