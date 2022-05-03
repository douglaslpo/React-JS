import React from 'react';
import {View, StyleSheet} from 'react-native';

<View style={styles.container}>
    <View style={styles.box} />
    <View style={styles.box} />
    <View style={styles.box} />
    <View style={styles.box} />
</View>

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#CCC',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
    },

    box: {
        width: 100,
        height: 100,
        backgroundColor: '#666',
        borderColor: '#999',
        borderWidth: 5,
        margin: 10,
    },
})